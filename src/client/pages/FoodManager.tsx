import { useState, useEffect } from 'react'
import { api } from '../api'
import type { Food, CreateFoodRequest } from '../../shared/types'
import ErrorBanner from '../components/ui/ErrorBanner'

export default function FoodManager() {
  const [foods, setFoods] = useState<Food[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [name, setName] = useState('')
  const [calories, setCalories] = useState('')
  const [protein, setProtein] = useState('')

  const loadFoods = async () => {
    try {
      const data = await api.getFoods()
      setFoods(data)
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadFoods() }, [])

  const resetForm = () => {
    setName('')
    setCalories('')
    setProtein('')
    setEditingId(null)
    setShowForm(false)
  }

  const startEdit = (food: Food) => {
    setName(food.name)
    setCalories(String(food.calories_per_100g))
    setProtein(food.protein_per_100g != null ? String(food.protein_per_100g) : '')
    setEditingId(food.id)
    setShowForm(true)
  }

  const handleSubmit = async () => {
    setError('')
    if (!name.trim() || !calories) {
      setError('Bitte Name und Kalorien angeben')
      return
    }
    const calNum = parseFloat(calories.replace(',', '.'))
    if (isNaN(calNum) || calNum <= 0) {
      setError('Kalorien müssen eine positive Zahl sein')
      return
    }
    let protNum: number | null = null
    if (protein.trim() !== '') {
      protNum = parseFloat(protein.replace(',', '.'))
      if (isNaN(protNum) || protNum <= 0) {
        setError('Eiweiß muss eine positive Zahl sein (oder leer lassen)')
        return
      }
    }

    const data: CreateFoodRequest = { name: name.trim(), calories_per_100g: calNum, protein_per_100g: protNum }
    try {
      if (editingId) {
        await api.updateFood(editingId, data)
      } else {
        await api.createFood(data)
      }
      resetForm()
      await loadFoods()
    } catch (e) {
      setError(String(e))
    }
  }

  const handleDelete = async (id: number) => {
    setError('')
    try {
      await api.deleteFood(id)
      await loadFoods()
    } catch (e) {
      setError(String(e))
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSubmit()
    if (e.key === 'Escape') resetForm()
  }

  if (loading) return <div className="p-4 text-gray-500">Lädt...</div>

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">🍎 Lebensmittel</h2>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            + Neu
          </button>
        )}
      </div>

      {error && <ErrorBanner message={error} />}

      {showForm && (
        <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold mb-3">{editingId ? 'Bearbeiten' : 'Neues Lebensmittel'}</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="z.B. Haferflocken"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Kalorien pro 100g</label>
              <input
                type="number"
                value={calories}
                onChange={(e) => setCalories(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="z.B. 370"
                step="0.1"
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Eiweiß pro 100g (g, optional)</label>
              <input
                type="number"
                value={protein}
                onChange={(e) => setProtein(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="z.B. 12"
                step="0.1"
                min="0"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSubmit}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                {editingId ? 'Speichern' : 'Hinzufügen'}
              </button>
              <button
                onClick={resetForm}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Abbrechen
              </button>
            </div>
          </div>
        </div>
      )}

      {foods.length === 0 && !showForm ? (
        <p className="text-gray-500">Noch keine Lebensmittel erfasst.</p>
      ) : (
        <div className="space-y-2">
          {foods.map((food) => (
            <div
              key={food.id}
              className="bg-white border border-gray-200 rounded-lg p-3 flex items-center justify-between"
            >
              <div>
                <span className="font-medium">{food.name}</span>
                <span className="text-gray-500 ml-3">{food.calories_per_100g} kcal / 100g</span>
                {food.protein_per_100g != null && (
                  <span className="text-gray-500 ml-2">{food.protein_per_100g} g Eiweiß / 100g</span>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => startEdit(food)}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  ✏️
                </button>
                <button
                  onClick={() => handleDelete(food.id)}
                  className="text-sm text-red-600 hover:text-red-800"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
