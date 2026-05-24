import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

const COLORS = [
  '#2563eb', '#dc2626', '#16a34a', '#d97706',
  '#9333ea', '#0891b2', '#be123c', '#059669',
]

interface ProgressRow {
  category_id: number
  category_name: string
  exercise_id: number
  exercise_name: string
  date: string
  max_weight: number
  total_reps: number
}

interface CategoryData {
  id: number
  name: string
  exercises: {
    id: number
    name: string
    rows: ProgressRow[]
  }[]
  dates: string[]
}

function formatDateShort(d: string) {
  return new Date(d).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })
}

function formatDateLong(d: string) {
  return new Date(d).toLocaleDateString('de-DE')
}

function buildChartData(category: CategoryData, metric: 'max_weight' | 'total_reps') {
  return category.dates.map((date) => {
    const point: any = { date }
    category.exercises.forEach((ex) => {
      const row = ex.rows.find((r) => r.date === date)
      point[`ex_${ex.id}`] = row ? row[metric] : null
    })
    return point
  })
}

function CategoryChartSection({ category }: { category: CategoryData }) {
  const weightData = buildChartData(category, 'max_weight')
  const repsData = buildChartData(category, 'total_reps')
  const hasData = category.dates.length >= 2

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-lg">{category.name}</h3>
      {!hasData ? (
        <p className="text-gray-500 text-sm">Mindestens 2 Trainingstage erforderlich für Diagramme</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl shadow-sm p-4">
            <h4 className="font-medium text-sm text-gray-700 mb-2">Gewicht (kg)</h4>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weightData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatDateShort}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    labelFormatter={formatDateLong}
                    formatter={(value: number, name: string) => [`${value} kg`, name]}
                  />
                  <Legend />
                  {category.exercises.map((ex, i) => (
                    <Line
                      key={ex.id}
                      type="monotone"
                      dataKey={`ex_${ex.id}`}
                      name={ex.name}
                      stroke={COLORS[i % COLORS.length]}
                      strokeWidth={2}
                      dot={false}
                      connectNulls={false}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4">
            <h4 className="font-medium text-sm text-gray-700 mb-2">Wiederholungen</h4>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={repsData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatDateShort}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    labelFormatter={formatDateLong}
                    formatter={(value: number, name: string) => [`${value}`, name]}
                  />
                  <Legend />
                  {category.exercises.map((ex, i) => (
                    <Line
                      key={ex.id}
                      type="monotone"
                      dataKey={`ex_${ex.id}`}
                      name={ex.name}
                      stroke={COLORS[i % COLORS.length]}
                      strokeWidth={2}
                      dot={false}
                      connectNulls={false}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [categories, setCategories] = useState<CategoryData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getAllProgress().then((rows: ProgressRow[]) => {
      const grouped = new Map<number, CategoryData>()
      for (const row of rows) {
        if (!grouped.has(row.category_id)) {
          grouped.set(row.category_id, {
            id: row.category_id,
            name: row.category_name,
            exercises: [],
            dates: [],
          })
        }
        const cat = grouped.get(row.category_id)!
        let ex = cat.exercises.find((e) => e.id === row.exercise_id)
        if (!ex) {
          ex = { id: row.exercise_id, name: row.exercise_name, rows: [] }
          cat.exercises.push(ex)
        }
        ex.rows.push(row)
        if (!cat.dates.includes(row.date)) {
          cat.dates.push(row.date)
        }
      }
      for (const cat of grouped.values()) {
        cat.dates.sort()
      }
      setCategories(Array.from(grouped.values()))
      setLoading(false)
    })
  }, [])

  if (loading) return <div className="p-4 text-center">Laden...</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Dashboard</h2>
        <button
          onClick={() => navigate('/trainings/new')}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 active:bg-blue-800 transition-colors"
        >
          + Training
        </button>
      </div>

      {categories.length === 0 ? (
        <div className="bg-white rounded-xl p-8 text-center shadow-sm">
          <p className="text-gray-500 mb-4">Noch keine Trainingsdaten vorhanden</p>
          <button
            onClick={() => navigate('/trainings/new')}
            className="text-blue-600 font-medium"
          >
            Erstes Training eintragen
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {categories.map((cat) => (
            <CategoryChartSection key={cat.id} category={cat} />
          ))}
        </div>
      )}
    </div>
  )
}
