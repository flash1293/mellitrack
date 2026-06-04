import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../api'
import { loadDraft, saveDraft, clearDraft } from '../components/TrainingForm/draft'
import DraftRestoreBanner from '../components/TrainingForm/DraftRestoreBanner'
import DateCategoryPicker from '../components/TrainingForm/DateCategoryPicker'
import ExerciseCard from '../components/TrainingForm/ExerciseCard'
import EmptyState from '../components/ui/EmptyState'
import ErrorBanner from '../components/ui/ErrorBanner'
import SaveCancelButtons from '../components/TrainingForm/SaveCancelButtons'
import type {
  ExerciseCategory,
  LastCategoryExerciseGroup,
  FormExerciseEntry,
  TrainingDetail,
} from '../../shared/types'

export default function TrainingForm() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = !!id

  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [categories, setCategories] = useState<ExerciseCategory[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [entries, setEntries] = useState<FormExerciseEntry[]>([])
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(isEdit)
  const [showDraftRestored, setShowDraftRestored] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const loadingCategoryRef = useRef<number | null>(null)
  const userSelectedRef = useRef(false)
  const hasDataRef = useRef(false)
  const restoredFromDraftRef = useRef(false)
  const selectedCategoryRef = useRef(selectedCategory)

  // --- On mount: restore draft immediately (before any API calls can interfere) ---
  useEffect(() => {
    if (isEdit) return
    const draft = loadDraft()
    if (draft && !draft.isEdit && !draft.trainingId) {
      restoredFromDraftRef.current = true
      setDate(draft.date)
      setSelectedCategory(draft.selectedCategory)
      setEntries(draft.entries)
      setShowDraftRestored(true)
    }
  }, [isEdit])

  // --- Keep ref in sync with selectedCategory (for use in async callbacks) ---
  useEffect(() => {
    selectedCategoryRef.current = selectedCategory
  }, [selectedCategory])

  // --- Load categories ---
  useEffect(() => {
    api.getCategories().then((cats) => {
      setCategories(cats)
      if (cats.length > 0 && !isEdit && !userSelectedRef.current && !selectedCategoryRef.current) {
        setSelectedCategory(String(cats[0].id))
      }
    }).catch((err) => {
      setError(err instanceof Error ? err.message : 'Fehler beim Laden der Kategorien')
    })
  }, [isEdit, selectedCategory])

  // --- Load existing training for editing ---
  useEffect(() => {
    if (!isEdit || !id) return
    api.getTraining(Number(id)).then((t: TrainingDetail) => {
      setDate(t.date)
      const firstEx = t.exercises[0]
      if (firstEx) {
        api.getExercises().then((allExs) => {
          const exData = allExs.find((e) => e.id === firstEx.exercise_id)
          if (exData && exData.categories && exData.categories.length > 0) {
            setSelectedCategory(String(exData.categories[0].id))
          }
        }).catch((err) => {
          setError(err instanceof Error ? err.message : 'Fehler beim Laden der Übungen')
        })
      }
      setEntries(
        t.exercises.map((ex) => ({
          exercise_id: ex.exercise_id,
          exercise_name: ex.exercise_name,
          sets: ex.sets.map((s) => {
            const prevSet = (ex.previous_sets || []).find((ps) => ps.set_number === s.set_number)
            return {
              set_number: s.set_number,
              weight: s.weight?.toString() ?? '',
              reps: s.reps?.toString() ?? '',
              prefilled_weight: s.weight?.toString() ?? '',
              prefilled_reps: s.reps?.toString() ?? '',
              previous_weight: prevSet?.weight?.toString() ?? '',
              previous_reps: prevSet?.reps?.toString() ?? '',
              touchedWeight: false,
              touchedReps: false,
            }
          }),
        }))
      )
      setLoading(false)
    }).catch((err) => {
      setError(err instanceof Error ? err.message : 'Fehler beim Laden des Trainings')
      setLoading(false)
    })
  }, [id, isEdit])

  // --- Draft verwerfen ---
  const discardDraft = useCallback(() => {
    clearDraft()
    setShowDraftRestored(false)
    restoredFromDraftRef.current = false
    setSelectedCategory('')
  }, [])

  // --- Save draft: visibility change (phone lock / tab close) ---
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden' && hasDataRef.current) {
        saveDraft(date, selectedCategory, entries, isEdit, id)
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [date, selectedCategory, entries, isEdit, id])

  // --- Save draft: beforeunload (tab close) ---
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (hasDataRef.current) {
        saveDraft(date, selectedCategory, entries, isEdit, id)
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [date, selectedCategory, entries, isEdit, id])

  // --- Save draft: immediate save on every data change (no debounce) ---
  useEffect(() => {
    if (!hasDataRef.current && entries.some(e => e.sets.some(s => s.weight || s.reps))) {
      hasDataRef.current = true
    }
    if (!hasDataRef.current) return
    saveDraft(date, selectedCategory, entries, isEdit, id)
  }, [date, selectedCategory, entries, isEdit, id])

  // --- Load exercises when category changes ---
  useEffect(() => {
    if (!selectedCategory || isEdit) return
    if (restoredFromDraftRef.current) {
      return
    }
    loadExercisesForCategory(parseInt(selectedCategory))
  }, [selectedCategory, isEdit])

  const loadExercisesForCategory = async (categoryId: number) => {
    loadingCategoryRef.current = categoryId
    let exercises, lastTraining
    try {
      exercises = await api.getExercisesByCategory(categoryId)
      lastTraining = await api.getLastCategoryTraining(categoryId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Laden der Übungen')
      return
    }

    if (loadingCategoryRef.current !== categoryId) return
    if (restoredFromDraftRef.current) {
      restoredFromDraftRef.current = false
      return
    }

    const newEntries: FormExerciseEntry[] = []
    const processedIds = new Set<number>()

    const lastTrainingByExercise: Record<number, LastCategoryExerciseGroup> = {}
    if (lastTraining) {
      for (const ex of lastTraining) {
        lastTrainingByExercise[ex.exercise_id] = ex
      }
    }

    for (const ex of exercises) {
      if (processedIds.has(ex.id)) continue
      processedIds.add(ex.id)

      const lastEx = lastTrainingByExercise[ex.id]
      if (lastEx && lastEx.sets && lastEx.sets.length > 0) {
        newEntries.push({
          exercise_id: lastEx.exercise_id,
          exercise_name: lastEx.exercise_name,
          sets: lastEx.sets.map((s, i) => ({
            set_number: i + 1,
            weight: s.weight?.toString() ?? '',
            reps: s.reps?.toString() ?? '',
            prefilled_weight: s.weight?.toString() ?? '',
            prefilled_reps: s.reps?.toString() ?? '',
            previous_weight: s.weight?.toString() ?? '',
            previous_reps: s.reps?.toString() ?? '',
            touchedWeight: false,
            touchedReps: false,
          })),
        })
      } else {
        newEntries.push({
          exercise_id: ex.id,
          exercise_name: ex.name,
          sets: [{
            set_number: 1,
            weight: '',
            reps: '',
            prefilled_weight: '',
            prefilled_reps: '',
            previous_weight: '',
            previous_reps: '',
            touchedWeight: false,
            touchedReps: false,
          }],
        })
      }
    }

    setEntries(newEntries)
  }

  const markTouched = (entryIndex: number, setIndex: number, field: 'weight' | 'reps') => {
    setEntries((prev) =>
      prev.map((e, i) =>
        i === entryIndex
          ? {
              ...e,
              sets: e.sets.map((s, si) =>
                si === setIndex
                  ? { ...s, [field === 'weight' ? 'touchedWeight' : 'touchedReps']: true }
                  : s
              ),
            }
          : e
      )
    )
  }

  const removeExercise = (index: number) => {
    setEntries((prev) => prev.filter((_, i) => i !== index))
  }

  const addSet = (entryIndex: number) => {
    setEntries((prev) =>
      prev.map((e, i) => {
        if (i !== entryIndex) return e
        const lastSet = e.sets[e.sets.length - 1]
        return {
          ...e,
          sets: [
            ...e.sets,
            {
              set_number: e.sets.length + 1,
              weight: lastSet?.weight || '',
              reps: lastSet?.reps || '',
              prefilled_weight: '',
              prefilled_reps: '',
              previous_weight: '',
              previous_reps: '',
              touchedWeight: false,
              touchedReps: false,
            },
          ],
        }
      })
    )
  }

  const removeSet = (entryIndex: number, setIndex: number) => {
    setEntries((prev) =>
      prev.map((e, i) =>
        i === entryIndex
          ? {
              ...e,
              sets: e.sets
                .filter((_, si) => si !== setIndex)
                .map((s, si) => ({ ...s, set_number: si + 1 })),
            }
          : e
      )
    )
  }

  const updateSet = (entryIndex: number, setIndex: number, field: 'weight' | 'reps', value: string) => {
    setEntries((prev) =>
      prev.map((e, i) =>
        i === entryIndex
          ? {
              ...e,
              sets: e.sets.map((s, si) =>
                si === setIndex ? { ...s, [field]: value } : s
              ),
            }
          : e
      )
    )
  }

  const handleSubmit = async () => {
    if (!date) return
    const validEntries = entries
      .map((e) => ({
        exercise_id: e.exercise_id,
        sets: e.sets
          .filter((s) => s.weight || s.reps)
          .map((s) => ({
            set_number: s.set_number,
            weight: parseFloat(s.weight) || 0,
            reps: parseInt(s.reps) || 0,
          })),
      }))
      .filter((e) => e.sets.length > 0)

    if (validEntries.length === 0) {
      setError('Mindestens eine Übung mit Sätzen eingeben')
      return
    }

    setSaving(true)
    try {
      if (isEdit && id) {
        await api.updateTraining(Number(id), { date, category_id: parseInt(selectedCategory), exercises: validEntries })
      } else {
        await api.createTraining({ date, category_id: parseInt(selectedCategory), exercises: validEntries })
      }
      clearDraft()
      navigate('/trainings')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="p-4 text-center">Laden...</div>

  const showEmpty = (!isEdit && entries.length === 0 && !showDraftRestored)
    || entries.length === 0

  return (
    <div className="space-y-4 max-w-2xl w-full overflow-hidden">
      <h2 className="text-xl font-bold">{isEdit ? 'Training bearbeiten' : 'Neues Training'}</h2>

      {showDraftRestored && (
        <DraftRestoreBanner date={date} onDiscard={discardDraft} />
      )}

      <ErrorBanner message={error} />

      <DateCategoryPicker
        date={date}
        onDateChange={setDate}
        categories={categories}
        selectedCategory={selectedCategory}
        onCategoryChange={(catId) => {
          userSelectedRef.current = true
          if (restoredFromDraftRef.current) {
            restoredFromDraftRef.current = false
          }
          setSelectedCategory(catId)
        }}
        disabled={isEdit}
      />

      {showEmpty ? (
        <EmptyState message="Keine Übungen in dieser Kategorie" />
      ) : (
        entries.map((entry, ei) => (
          <ExerciseCard
            key={ei}
            entry={entry}
            entryIndex={ei}
            isEdit={isEdit}
            onUpdateSet={updateSet}
            onBlurSet={markTouched}
            onRemoveSet={removeSet}
            onAddSet={addSet}
            onRemoveExercise={removeExercise}
          />
        ))
      )}

      <SaveCancelButtons
        onCancel={() => navigate('/trainings')}
        onSubmit={handleSubmit}
        saving={saving}
        disabled={entries.length === 0}
      />
    </div>
  )
}
