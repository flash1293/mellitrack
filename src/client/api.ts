import type {
  ExerciseWithCategories,
  ExerciseCategory,
  ExerciseInCategory,
  AuthResponse,
  AuthCheckResponse,
  SuccessResponse,
  DeleteExerciseResponse,
  TrainingListItem,
  TrainingDetail,
  LastSetResponse,
  LastCategoryExerciseGroup,
  CreateTrainingResponse,
  AllProgressRow,
  ExerciseProgressRow,
  CreateExerciseRequest,
  UpdateExerciseRequest,
  TrainingExerciseInput,
} from '../shared/types'

const API_BASE = '/api'

async function fetchApi<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (res.status === 401) {
    if (!path.startsWith('/auth') && window.location.pathname !== '/login') {
      // Dispatch a custom event so App.tsx can set auth state without a full page reload
      window.dispatchEvent(new CustomEvent('auth:unauthorized'))
    }
    const err = await res.json().catch(() => ({})) as { error?: string }
    throw new Error(err.error || 'Unauthorized')
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: string }
    throw new Error(err.error || `HTTP ${res.status}`)
  }
  return res.json()
}

export const api = {
  login: (username: string, password: string) =>
    fetchApi<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),
  register: (username: string, password: string) =>
    fetchApi<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),
  logout: () => fetchApi<SuccessResponse>('/auth/logout', { method: 'POST' }),
  checkAuth: () => fetchApi<AuthCheckResponse>('/auth/check'),

  getExercises: () => fetchApi<ExerciseWithCategories[]>('/exercises'),
  createExercise: (data: CreateExerciseRequest) =>
    fetchApi<SuccessResponse & { id?: number }>('/exercises', { method: 'POST', body: JSON.stringify(data) }),
  updateExercise: (id: number, data: UpdateExerciseRequest) =>
    fetchApi<SuccessResponse>(`/exercises/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteExercise: (id: number) =>
    fetchApi<DeleteExerciseResponse>(`/exercises/${id}`, { method: 'DELETE' }),
  getCategories: () => fetchApi<ExerciseCategory[]>('/exercises/categories'),
  createCategory: (name: string) =>
    fetchApi<SuccessResponse>('/exercises/categories', { method: 'POST', body: JSON.stringify({ name }) }),
  reorderCategories: (ids: number[]) =>
    fetchApi<SuccessResponse>('/exercises/categories/reorder', { method: 'PUT', body: JSON.stringify({ ids }) }),
  reorderExercises: (ids: number[]) =>
    fetchApi<SuccessResponse>('/exercises/reorder', { method: 'PUT', body: JSON.stringify({ ids }) }),
  getExercisesByCategory: (categoryId: number) =>
    fetchApi<ExerciseInCategory[]>(`/exercises/by-category/${categoryId}`),

  getTrainings: () => fetchApi<TrainingListItem[]>('/trainings'),
  getTraining: (id: number) => fetchApi<TrainingDetail>(`/trainings/${id}`),
  createTraining: (data: { date: string; category_id: number; exercises: TrainingExerciseInput[] }) =>
    fetchApi<CreateTrainingResponse>('/trainings', { method: 'POST', body: JSON.stringify(data) }),
  deleteTraining: (id: number) =>
    fetchApi<SuccessResponse>(`/trainings/${id}`, { method: 'DELETE' }),
  getLastSet: (exerciseId: number) =>
    fetchApi<LastSetResponse>(`/trainings/last-set/${exerciseId}`),
  getLastCategoryTraining: (categoryId: number) =>
    fetchApi<LastCategoryExerciseGroup[]>(`/trainings/last-category/${categoryId}`),
  updateTraining: (id: number, data: { date: string; category_id?: number; exercises: TrainingExerciseInput[] }) =>
    fetchApi<SuccessResponse>(`/trainings/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  getProgress: (exerciseId: number) =>
    fetchApi<ExerciseProgressRow[]>(`/progress/${exerciseId}`),
  getAllProgress: () => fetchApi<AllProgressRow[]>('/progress'),
}
