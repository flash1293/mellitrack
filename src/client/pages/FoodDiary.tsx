import { useState, useEffect } from 'react'
import { api } from '../api'
import type { Food, FoodEntryWithName, DailySummary } from '../../shared/types'
import ErrorBanner from '../components/ui/ErrorBanner'

function todayStr(): string {
  const d = new Date()
  return d.toISOString().slice(0, 10)
}

function formatDate(d: string): string {
  const [y, m, day] = d.split('-')
  return `${day}.${m}.${y}`
}

const CUSTOM_VALUE = '__custom__'

export default function FoodDiary() {
  const [date, setDate] = useState(todayStr())
  const [summary, setSummary] = useState<DailySummary | null>(null)
  const [foods, setFoods] = useState<Food[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [selectedFoodId, setSelectedFoodId] = useState('')
  const [customName, setCustomName] = useState('')
  const [customCalories, setCustomCalories] = useState('')
  const [amount, setAmount] = useState('')

  const isCustom = selectedFoodId === CUSTOM_VALUE

  const loadData = async () => {
    setLoading(true)
    setError('')
    try {
      const [sum, foodList] = await Promise.all([
        api.getDailySummary(date),
        api.getFoods(),
      ])
      setSummary(sum)
      setFoods(foodList)
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [date])

  const resetForm = () => {
    setSelectedFoodId('')
    setCustomName('')
    setCustomCalories('')
    setAmount('')
    setShowForm(false)
  }

  const handleSubmit = async () => {
    setError('')

    const grams = parseFloat(amount.replace(',', '.'))
    if (isNaN(grams) || grams <= 0) {
      setError('Bitte gültige Gramm-Zahl eingeben')
      return
    }
    const consumedAt = `${date}T12:00:00`

    try {
      if (isCustom) {
        if (!customName.trim()) {
          setError('Bitte Titel eingeben')
          return
        }
        const cal = parseFloat(customCalories.replace(',', '.'))
        if (isNaN(cal) || cal <= 0) {
          setError('Bitte gültige Kalorien je 100g eingeben')
          return
        }
        await api.createFoodEntry({
          custom_name: customName.trim(),
          custom_calories_per_100g: cal,
          amount_grams: grams,
          consumed_at: consumedAt,
        })
      } else {
        const foodId = parseInt(selectedFoodId)
        if (!foodId || isNaN(foodId)) {
          setError('Bitte Lebensmittel auswählen')
          return
        }
        await api.createFoodEntry({ food_id: foodId, amount_grams: grams, consumed_at: consumedAt })
      }
      resetForm()
      await loadData()
    } catch (e) {
      setError(String(e))
    }
  }

  const handleDelete = async (id: number) => {
    setError('')
    try {
      await api.deleteFoodEntry(id)
      await loadData()
    } catch (e) {
      setError(String(e))
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSubmit()
    if (e.key === 'Escape') resetForm()
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">📔 Ernährungstagebuch</h2>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={() => {
            const d = new Date(date)
            d.setDate(d.getDate() - 1)
            setDate(d.toISOString().slice(0, 10))
          }}
          className="px-3 py-1 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          ←
        </button>
        <span className="font-medium">{formatDate(date)}</span>
        <button
          onClick={() => {
            const d = new Date(date)
            d.setDate(d.getDate() + 1)
            setDate(d.toISOString().slice(0, 10))
          }}
          className="px-3 py-1 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          →
        </button>
        <button
          onClick={() => setDate(todayStr())}
          className="px-3 py-1 text-sm text-blue-600 hover:text-blue-800"
        >
          Heute
        </button>
      </div>

      {error && <ErrorBanner message={error} />}

      {loading ? (
        <p className="text-gray-500">Lädt...</p>
      ) : (
        <>
          {/* Summary card */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-blue-700 mb-1">Gesamtkalorien</p>
            <p className="text-3xl font-bold text-blue-800">{summary?.total_calories ?? 0} kcal</p>
          </div>

          {/* Entries */}
          {summary && summary.entries.length > 0 ? (
            <div className="space-y-2 mb-6">
              {summary.entries.map((entry: FoodEntryWithName) => (
                <div
                  key={entry.id}
                  className="bg-white border border-gray-200 rounded-lg p-3 flex items-center justify-between"
                >
                  <div>
                    <span className="font-medium">{entry.name}</span>
                    <span className="text-gray-500 ml-2">{entry.amount_grams}g</span>
                    <span className="text-gray-400 ml-2">
                      ({entry.calories} kcal)
                    </span>
                  </div>
                  <button
                    onClick={() => handleDelete(entry.id)}
                    className="text-sm text-red-600 hover:text-red-800"
                  >
                    🗑️
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 mb-6">Noch keine Einträge für diesen Tag.</p>
          )}

          {/* Add form */}
          {showForm ? (
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold mb-3">Eintrag hinzufügen</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Lebensmittel</label>
                  <select
                    value={selectedFoodId}
                    onChange={(e) => setSelectedFoodId(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Bitte wählen...</option>
                    <option value={CUSTOM_VALUE}>✏️ Freier Eintrag</option>
                    {foods.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name} ({f.calories_per_100g} kcal/100g)
                      </option>
                    ))}
                  </select>
                </div>

                {isCustom && (
                  <>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Titel</label>
                      <input
                        type="text"
                        value={customName}
                        onChange={(e) => setCustomName(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="z.B. Apfelkuchen"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Kalorien je 100g</label>
                      <input
                        type="number"
                        value={customCalories}
                        onChange={(e) => setCustomCalories(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="z.B. 250"
                        step="0.1"
                        min="0"
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-sm text-gray-600 mb-1">Menge (g)</label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="z.B. 150"
                    step="1"
                    min="0"
                    autoFocus
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleSubmit}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Hinzufügen
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
          ) : (
            <button
              onClick={() => setShowForm(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              + Eintrag hinzufügen
            </button>
          )}
        </>
      )}
    </div>
  )
}
