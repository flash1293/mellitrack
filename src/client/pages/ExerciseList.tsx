import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import type { ExerciseCategory, ExerciseWithCategories } from '../../shared/types'

export default function ExerciseList() {
  const navigate = useNavigate()
  const [exercises, setExercises] = useState<ExerciseWithCategories[]>([])
  const [categories, setCategories] = useState<ExerciseCategory[]>([])
  const [newExerciseName, setNewExerciseName] = useState('')
  const [newExerciseCategories, setNewExerciseCategories] = useState<number[]>([])
  const [newCategoryName, setNewCategoryName] = useState('')
  const [showAddExercise, setShowAddExercise] = useState(false)
  const [showAddCategory, setShowAddCategory] = useState(false)
  const [editingExercise, setEditingExercise] = useState<number | null>(null)
  const [editName, setEditName] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = () => {
    api.getExercises().then((data) => setExercises(data))
    api.getCategories().then((cats) => {
      setCategories(cats)
      if (cats.length > 0 && newExerciseCategories.length === 0) {
        setNewExerciseCategories([cats[0].id])
      }
    })
  }

  const handleAddExercise = async () => {
    if (!newExerciseName.trim() || newExerciseCategories.length === 0) return
    await api.createExercise({
      name: newExerciseName.trim(),
      category_ids: newExerciseCategories,
    })
    setNewExerciseName('')
    setNewExerciseCategories(categories.length > 0 ? [categories[0].id] : [])
    setShowAddExercise(false)
    loadData()
  }

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return
    await api.createCategory(newCategoryName.trim())
    setNewCategoryName('')
    setShowAddCategory(false)
    loadData()
  }

  const handleUpdateExercise = async (id: number) => {
    if (!editName.trim()) return
    const ex = exercises.find((e) => e.id === id)
    await api.updateExercise(id, {
      name: editName.trim(),
      category_ids: ex?.categories?.map((c) => c.id) || [],
    })
    setEditingExercise(null)
    setEditName('')
    loadData()
  }

  const handleDeleteExercise = async (id: number) => {
    if (!confirm('Übung wirklich löschen?')) return
    await api.deleteExercise(id)
    loadData()
  }

  const toggleCategory = (catId: number) => {
    setNewExerciseCategories((prev) =>
      prev.includes(catId) ? prev.filter((id) => id !== catId) : [...prev, catId]
    )
  }

  const moveCategory = async (index: number, direction: 'up' | 'down') => {
    const newCats = [...categories]
    const swap = direction === 'up' ? index - 1 : index + 1
    if (swap < 0 || swap >= newCats.length) return
    ;[newCats[index], newCats[swap]] = [newCats[swap], newCats[index]]
    setCategories(newCats)
    await api.reorderCategories(newCats.map((c) => c.id))
  }

  const moveExercise = async (catIndex: number, exIndex: number, direction: 'up' | 'down') => {
    const cat = grouped[catIndex]
    const ids = cat.exercises.map((e) => e.id)
    const swap = direction === 'up' ? exIndex - 1 : exIndex + 1
    if (swap < 0 || swap >= ids.length) return
    ;[ids[exIndex], ids[swap]] = [ids[swap], ids[exIndex]]
    await api.reorderExercises(ids)
    loadData()
  }

  // Group exercises by category for display
  const grouped = categories.map((cat) => ({
    ...cat,
    exercises: exercises.filter((ex) =>
      ex.categories?.some((c) => c.id === cat.id)
    ),
  }))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Übungen</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAddCategory(!showAddCategory)}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            + Kategorie
          </button>
          <button
            onClick={() => setShowAddExercise(!showAddExercise)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 active:bg-blue-800 transition-colors"
          >
            + Übung
          </button>
        </div>
      </div>

      {showAddCategory && (
        <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
          <h3 className="font-medium">Neue Kategorie</h3>
          <input
            type="text"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            placeholder="Kategorie Name"
            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none"
          />
          <div className="flex gap-2">
            <button
              onClick={() => setShowAddCategory(false)}
              className="flex-1 py-2 border border-gray-300 rounded-lg"
            >
              Abbrechen
            </button>
            <button
              onClick={handleAddCategory}
              className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-medium"
            >
              Hinzufügen
            </button>
          </div>
        </div>
      )}

      {showAddExercise && (
        <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
          <h3 className="font-medium">Neue Übung</h3>
          <input
            type="text"
            value={newExerciseName}
            onChange={(e) => setNewExerciseName(e.target.value)}
            placeholder="Übungsname"
            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none"
          />
          <div>
            <p className="text-sm text-gray-600 mb-2">Kategorien</p>
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => toggleCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                    newExerciseCategories.includes(cat.id)
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowAddExercise(false)}
              className="flex-1 py-2 border border-gray-300 rounded-lg"
            >
              Abbrechen
            </button>
            <button
              onClick={handleAddExercise}
              className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-medium"
            >
              Hinzufügen
            </button>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {grouped.map((cat, gi) => (
          <div key={cat.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="flex items-center justify-between p-4 bg-gray-50 border-b border-gray-100">
              <h3 className="font-semibold">{cat.name}</h3>
              <div className="flex gap-1">
                <button
                  onClick={() => moveCategory(gi, 'up')}
                  className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-200 rounded transition-colors"
                  aria-label="Nach oben"
                >↑</button>
                <button
                  onClick={() => moveCategory(gi, 'down')}
                  className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-200 rounded transition-colors"
                  aria-label="Nach unten"
                >↓</button>
              </div>
            </div>
            {cat.exercises.length === 0 ? (
              <p className="p-4 text-sm text-gray-500">Keine Übungen</p>
            ) : (
              <div className="divide-y divide-gray-100">
                {cat.exercises.map((ex, ei) => (
                  <div
                    key={`${cat.id}-${ex.id}`}
                    className={`flex items-center justify-between p-4 hover:bg-gray-50 transition-colors ${
                      ex.deleted_at ? 'bg-gray-50/80' : ''
                    }`}
                  >
                    {editingExercise === ex.id ? (
                      <div className="flex items-center gap-2 flex-1">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="flex-1 px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleUpdateExercise(ex.id)
                            if (e.key === 'Escape') {
                              setEditingExercise(null)
                              setEditName('')
                            }
                          }}
                        />
                        <button
                          onClick={() => handleUpdateExercise(ex.id)}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </button>
                        <button
                          onClick={() => {
                            setEditingExercise(null)
                            setEditName('')
                          }}
                          className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ) : (
                      <>
                        <button
                          onClick={() => navigate(`/progress/${ex.id}`)}
                          className="flex-1 text-left flex items-center justify-between"
                        >
                          <span className={`font-medium ${ex.deleted_at ? 'text-gray-500 line-through' : ''}`}>
                            {ex.name}
                          </span>
                          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                        <div className="flex items-center gap-1 ml-2">
                          <button
                            onClick={() => moveExercise(gi, ei, 'up')}
                            className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
                            aria-label="Nach oben"
                          >↑</button>
                          <button
                            onClick={() => moveExercise(gi, ei, 'down')}
                            className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
                            aria-label="Nach unten"
                          >↓</button>
                          {ex.deleted_at ? (
                            <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded-full whitespace-nowrap">
                              Gelöscht
                            </span>
                          ) : (
                            <button
                              onClick={() => handleDeleteExercise(ex.id)}
                              className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              aria-label="Löschen"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setEditingExercise(ex.id)
                              setEditName(ex.name)
                            }}
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            aria-label="Bearbeiten"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
