import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../api'

interface Set {
  set_number: number
  weight: string
  reps: string
  prefilled_weight: string
  prefilled_reps: string
}

interface ExerciseEntry {
  exercise_id: number
  exercise_name: string
  sets: Set[]
}

export default function TrainingForm() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = !!id

  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [categories, setCategories] = useState<any[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [entries, setEntries] = useState<ExerciseEntry[]>([])
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(isEdit)
  const loadingCategoryRef = useRef<number | null>(null)
  const userSelectedRef = useRef(false)

  useEffect(() => {
    api.getCategories().then((cats: any[]) => {
      setCategories(cats)
      if (cats.length > 0 && !isEdit && !userSelectedRef.current && !selectedCategory) {
        setSelectedCategory(String(cats[0].id))
      }
    })
  }, [isEdit, selectedCategory])

  useEffect(() => {
    if (!isEdit || !id) return
    api.getTraining(Number(id)).then((t: any) => {
      setDate(t.date)
      // Infer category from first exercise's categories
      const firstEx = t.exercises[0]
      if (firstEx) {
        api.getExercises().then((allExs: any[]) => {
          const exData = allExs.find((e) => e.id === firstEx.exercise_id)
          if (exData && exData.categories && exData.categories.length > 0) {
            setSelectedCategory(String(exData.categories[0].id))
          }
        })
      }
      setEntries(
        t.exercises.map((ex: any) => ({
          exercise_id: ex.exercise_id,
          exercise_name: ex.exercise_name,
          sets: ex.sets.map((s: any) => ({
            set_number: s.set_number,
            weight: s.weight?.toString() ?? '',
            reps: s.reps?.toString() ?? '',
            prefilled_weight: s.weight?.toString() ?? '',
            prefilled_reps: s.reps?.toString() ?? '',
          })),
        }))
      )
      setLoading(false)
    })
  }, [id, isEdit])

  useEffect(() => {
    if (!selectedCategory || isEdit) return
    loadExercisesForCategory(parseInt(selectedCategory))
  }, [selectedCategory, isEdit])

  const loadExercisesForCategory = async (categoryId: number) => {
    loadingCategoryRef.current = categoryId
    const exercises = await api.getExercisesByCategory(categoryId)
    const lastTraining = await api.getLastCategoryTraining(categoryId)

    // If category changed while we were loading, discard this result
    if (loadingCategoryRef.current !== categoryId) return

    const newEntries: ExerciseEntry[] = []

    for (const ex of exercises) {
      const lastEx = lastTraining?.find((le: any) => le.exercise_id === ex.id)
      if (lastEx && lastEx.sets && lastEx.sets.length > 0) {
        newEntries.push({
          exercise_id: ex.id,
          exercise_name: ex.name,
          sets: lastEx.sets.map((s: any, i: number) => ({
            set_number: i + 1,
            weight: s.weight?.toString() ?? '',
            reps: s.reps?.toString() ?? '',
            prefilled_weight: s.weight?.toString() ?? '',
            prefilled_reps: s.reps?.toString() ?? '',
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
          }],
        })
      }
    }

    setEntries(newEntries)
  }

  const isChanged = (set: Set, field: 'weight' | 'reps') => {
    return set[field] !== (field === 'weight' ? set.prefilled_weight : set.prefilled_reps)
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
      alert('Mindestens eine Übung mit Sätzen eingeben')
      return
    }

    setSaving(true)
    try {
      if (isEdit && id) {
        await api.updateTraining(Number(id), { date, category_id: parseInt(selectedCategory), exercises: validEntries })
      } else {
        await api.createTraining({ date, category_id: parseInt(selectedCategory), exercises: validEntries })
      }
      navigate('/trainings')
    } catch (err: any) {
      alert(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="p-4 text-center">Laden...</div>

  return (
    <div className="space-y-4 max-w-2xl w-full overflow-hidden">
      <h2 className="text-xl font-bold">{isEdit ? 'Training bearbeiten' : 'Neues Training'}</h2>

      <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Datum</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Kategorie</label>
          <select
            value={selectedCategory}
            onChange={(e) => {
              userSelectedRef.current = true
              setSelectedCategory(e.target.value)
            }}
            disabled={isEdit}
            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none bg-white disabled:bg-gray-100 disabled:text-gray-500"
          >
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {entries.length === 0 ? (
        <div className="bg-white rounded-xl p-8 text-center shadow-sm">
          <p className="text-gray-500">Keine Übungen in dieser Kategorie</p>
        </div>
      ) : (
        entries.map((entry, ei) => (
          <div key={ei} className="bg-white rounded-xl shadow-sm p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-medium">{entry.exercise_name}</span>
              {!isEdit && (
                <button
                  onClick={() => removeExercise(ei)}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            <div className="space-y-2">
              {entry.sets.map((set, si) => (
                <div key={si} className="grid grid-cols-[auto_minmax(0,1fr)_auto_minmax(0,1fr)_auto] gap-1 items-center">
                  <span className="text-sm text-gray-500 shrink-0">S{set.set_number}</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    placeholder="kg"
                    value={set.weight}
                    onChange={(e) => updateSet(ei, si, 'weight', e.target.value)}
                    style={{ minWidth: 0, width: '100%' }}
                    className={`px-2 py-2 rounded-lg border outline-none transition-colors ${
                      isChanged(set, 'weight')
                        ? 'border-l-4 border-l-blue-500 border-gray-300 focus:bg-blue-50'
                        : 'border-gray-300 focus:bg-amber-50'
                    }`}
                  />
                  <span className="text-lg shrink-0">⚖️</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    placeholder="Wdh"
                    value={set.reps}
                    onChange={(e) => updateSet(ei, si, 'reps', e.target.value)}
                    style={{ minWidth: 0, width: '100%' }}
                    className={`px-2 py-2 rounded-lg border outline-none transition-colors ${
                      isChanged(set, 'reps')
                        ? 'border-l-4 border-l-blue-500 border-gray-300 focus:bg-blue-50'
                        : 'border-gray-300 focus:bg-amber-50'
                    }`}
                  />
                  <span className="text-lg shrink-0">🔁</span>
                  <button
                    onClick={() => removeSet(ei, si)}
                    className="p-2 text-gray-400 hover:text-red-500 transition-colors shrink-0"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={() => addSet(ei)}
              className="w-full py-2 text-sm text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
            >
              + Satz hinzufügen
            </button>
          </div>
        ))
      )}

      <div className="flex gap-3">
        <button
          onClick={() => navigate('/trainings')}
          className="flex-1 py-3 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors"
        >
          Abbrechen
        </button>
        <button
          onClick={handleSubmit}
          disabled={saving || entries.length === 0}
          className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 transition-colors"
        >
          {saving ? 'Speichern...' : 'Speichern'}
        </button>
      </div>
    </div>
  )
}
