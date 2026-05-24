const API_BASE = '/api'

async function fetchApi<T = any>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (res.status === 401) {
    if (!path.startsWith('/auth') && window.location.pathname !== '/login') {
      window.location.href = '/login'
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
  login: (username: string, password: string) => fetchApi('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  }),
  register: (username: string, password: string) => fetchApi('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  }),
  logout: () => fetchApi('/auth/logout', { method: 'POST' }),
  checkAuth: () => fetchApi('/auth/check'),

  getExercises: () => fetchApi('/exercises'),
  createExercise: (data: { name: string; category_ids: number[] }) =>
    fetchApi('/exercises', { method: 'POST', body: JSON.stringify(data) }),
  updateExercise: (id: number, data: { name: string; category_ids?: number[] }) =>
    fetchApi(`/exercises/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteExercise: (id: number) =>
    fetchApi(`/exercises/${id}`, { method: 'DELETE' }),
  getCategories: () => fetchApi('/exercises/categories'),
  createCategory: (name: string) =>
    fetchApi('/exercises/categories', { method: 'POST', body: JSON.stringify({ name }) }),
  getExercisesByCategory: (categoryId: number) => fetchApi(`/exercises/by-category/${categoryId}`),

  getTrainings: () => fetchApi('/trainings'),
  getTraining: (id: number) => fetchApi(`/trainings/${id}`),
  createTraining: (data: { date: string; category_id: number; exercises: any[] }) =>
    fetchApi('/trainings', { method: 'POST', body: JSON.stringify(data) }),
  deleteTraining: (id: number) => fetchApi(`/trainings/${id}`, { method: 'DELETE' }),
  getLastSet: (exerciseId: number) => fetchApi(`/trainings/last-set/${exerciseId}`),
  getLastCategoryTraining: (categoryId: number) => fetchApi(`/trainings/last-category/${categoryId}`),
  updateTraining: (id: number, data: { date: string; category_id?: number; exercises: any[] }) =>
    fetchApi(`/trainings/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  getProgress: (exerciseId: number) => fetchApi(`/progress/${exerciseId}`),
  getAllProgress: () => fetchApi('/progress'),
}
