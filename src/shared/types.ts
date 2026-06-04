// ============================================================
// Mellitrack — Shared Type Definitions
// ============================================================
// Single source of truth for all data shapes used in client
// and server code.
// ============================================================

// --------------------------------------------------
// Database Entity Types
// --------------------------------------------------

export interface User {
  id: number
  username: string
  password_hash: string
}

export interface ExerciseCategory {
  id: number
  name: string
  user_id: number
  sort_order: number
}

export interface Exercise {
  id: number
  name: string
  user_id: number
  deleted_at: string | null
  sort_order: number
}

export interface ExerciseWithCategories extends Exercise {
  categories: { id: number; name: string }[]
}

export interface Training {
  id: number
  date: string
  user_id: number
  category_id: number
}

export interface TrainingExercise {
  id: number
  training_id: number
  exercise_id: number
}

export interface Set {
  id: number
  training_exercise_id: number
  set_number: number
  weight: number | null
  reps: number | null
}

export interface ExerciseCategoryMapping {
  exercise_id: number
  category_id: number
}

// --------------------------------------------------
// Auth — API Types
// --------------------------------------------------

export interface LoginRequest {
  username: string
  password: string
}

export interface RegisterRequest {
  username: string
  password: string
}

export interface AuthResponse {
  success: boolean
  userId?: number
}

export interface AuthCheckResponse {
  authenticated: boolean
  username?: string
}

export interface ErrorResponse {
  error: string
}

// --------------------------------------------------
// Exercises — API Types
// --------------------------------------------------

export interface CreateExerciseRequest {
  name: string
  category_ids: number[]
}

export interface UpdateExerciseRequest {
  name: string
  category_ids?: number[]
}

export interface ReorderRequest {
  ids: number[]
}

export interface DeleteExerciseResponse {
  success: boolean
  deleted: 'soft' | 'hard'
}

export interface ExerciseInCategory {
  id: number
  name: string
}

// --------------------------------------------------
// Trainings — API Types
// --------------------------------------------------

export interface TrainingListItem {
  id: number
  date: string
  category_id: number
  category_name: string | null
  exercise_count: number
}

export interface SetData {
  id: number
  set_number: number
  weight: number | null
  reps: number | null
}

export interface PreviousSetData {
  set_number: number
  weight: number | null
  reps: number | null
}

export interface TrainingExerciseDetail {
  id: number
  exercise_id: number
  exercise_name: string
  sets: SetData[]
  previous_sets: PreviousSetData[]
}

export interface TrainingDetail {
  id: number
  date: string
  user_id: number
  category_id: number
  category_name: string
  exercises: TrainingExerciseDetail[]
}

export interface LastSetResponse {
  weight: number | null
  reps: number | null
}

export interface LastCategorySet {
  set_number: number
  weight: number | null
  reps: number | null
}

export interface LastCategoryExerciseGroup {
  exercise_id: number
  exercise_name: string
  sets: LastCategorySet[]
}

export interface SetInput {
  set_number: number
  weight: number
  reps: number
}

export interface TrainingExerciseInput {
  exercise_id: number
  sets: SetInput[]
}

export interface CreateTrainingRequest {
  date: string
  category_id: number
  exercises: TrainingExerciseInput[]
}

export interface UpdateTrainingRequest {
  date: string
  category_id?: number
  exercises: TrainingExerciseInput[]
}

export interface CreateTrainingResponse {
  id: number
  success: boolean
}

export interface SuccessResponse {
  success: boolean
}

// --------------------------------------------------
// Progress — API Types
// --------------------------------------------------

export interface AllProgressRow {
  category_id: number
  category_name: string
  exercise_id: number
  exercise_name: string
  date: string
  max_weight: number
  total_reps: number
}

export interface ProgressSetJson {
  set_number: number
  weight: number
  reps: number
}

export interface ExerciseProgressRow {
  date: string
  category_id: number
  category_name: string
  exercise_id: number
  exercise_name: string
  avg_weight: number
  max_weight: number
  total_reps: number
  set_count: number
  sets: string // JSON string from sqlite json_group_array
}

// --------------------------------------------------
// Client — Form & State Types
// --------------------------------------------------

export interface FormSet {
  set_number: number
  weight: string
  reps: string
  prefilled_weight: string
  prefilled_reps: string
  previous_weight: string
  previous_reps: string
  touchedWeight: boolean
  touchedReps: boolean
}

export interface FormExerciseEntry {
  exercise_id: number
  exercise_name: string
  sets: FormSet[]
}

export interface DraftData {
  date: string
  selectedCategory: string
  entries: FormExerciseEntry[]
  isEdit: boolean
  trainingId?: string
}

// --------------------------------------------------
// Client — Dashboard Types
// --------------------------------------------------

export interface DashboardCategoryData {
  id: number
  name: string
  exercises: DashboardExerciseData[]
  dates: string[]
}

export interface DashboardExerciseData {
  id: number
  name: string
  rows: AllProgressRow[]
}
