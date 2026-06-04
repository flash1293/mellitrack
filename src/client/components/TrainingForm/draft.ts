import type { DraftData, FormExerciseEntry } from '../../../shared/types'

const DRAFT_KEY = 'mellitrack_training_draft'

export function saveDraft(date: string, selectedCategory: string, entries: FormExerciseEntry[], isEdit: boolean, trainingId?: string) {
  try {
    const data: DraftData = { date, selectedCategory, entries, isEdit, trainingId }
    localStorage.setItem(DRAFT_KEY, JSON.stringify(data))
  } catch {
    // localStorage might be full — silently ignore
  }
}

export function clearDraft() {
  try {
    localStorage.removeItem(DRAFT_KEY)
  } catch {
    // silently ignore
  }
}

export function loadDraft(): DraftData | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}
