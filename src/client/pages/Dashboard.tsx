import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import FormButton from '../components/ui/FormButton'
import EmptyState from '../components/ui/EmptyState'
import ErrorBanner from '../components/ui/ErrorBanner'
import { formatDateShort, formatDateLong } from '../utils/dates'
import { groupProgressByCategory } from '../utils/grouping'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts'
import type {
  AllProgressRow,
  DashboardCategoryData,
} from '../../shared/types'

const COLORS = [
  '#2563eb', '#dc2626', '#16a34a', '#d97706',
  '#9333ea', '#0891b2', '#be123c', '#059669',
]

type Variant = 'original' | 'dual'

const tabs: { key: Variant; label: string; icon: string }[] = [
  { key: 'original', label: 'Original', icon: '📊' },
  { key: 'dual', label: 'Dual-Achse', icon: '📈' },
]

// ──────────────────────────────────────────────
// Original
// ──────────────────────────────────────────────

interface ChartDataPoint {
  date: string
  [key: string]: string | number | null
}

function OriginalSection({ category }: { category: DashboardCategoryData }) {
  const build = (metric: 'max_weight' | 'total_reps') =>
    category.dates.map((date) => {
      const point: ChartDataPoint = { date }
      category.exercises.forEach((ex) => {
        const row = ex.rows.find((r) => r.date === date)
        point[`ex_${ex.id}`] = row ? row[metric] : null
      })
      return point
    })

  const weightData = build('max_weight')
  const repsData = build('total_reps')
  const hasData = category.dates.length >= 2

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-lg">{category.name}</h3>
      {!hasData ? (
        <p className="text-gray-500 text-sm">Mindestens 2 Trainingstage erforderlich</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl shadow-sm p-4">
            <h4 className="font-medium text-sm text-gray-700 mb-2">Gewicht (kg)</h4>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weightData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tickFormatter={formatDateShort} tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip labelFormatter={formatDateLong} formatter={(v: number, n: string) => [`${v} kg`, n]} />
                  <Legend />
                  {category.exercises.map((ex, i) => (
                    <Line key={ex.id} type="monotone" dataKey={`ex_${ex.id}`} name={ex.name}
                      stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={false} connectNulls={false} />
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
                  <XAxis dataKey="date" tickFormatter={formatDateShort} tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip labelFormatter={formatDateLong} formatter={(v: number, n: string) => [v, n]} />
                  <Legend />
                  {category.exercises.map((ex, i) => (
                    <Line key={ex.id} type="monotone" dataKey={`ex_${ex.id}`} name={ex.name}
                      stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={false} connectNulls={false} />
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

// ──────────────────────────────────────────────
// Variant 1: Dual-Axis (side by side, larger, dots)
// ──────────────────────────────────────────────

function DualAxisSection({ category }: { category: DashboardCategoryData }) {
  const [highlighted, setHighlighted] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)

  const data = category.dates.map((date) => {
    const point: Record<string, string | number | null> = { date }
    category.exercises.forEach((ex) => {
      const row = ex.rows.find((r) => r.date === date)
      point[`w_${ex.id}`] = row ? row.max_weight : null
      point[`r_${ex.id}`] = row ? row.total_reps : null
    })
    return point
  })

  const hasData = category.dates.length >= 2
  const filtered = search
    ? category.exercises.filter((ex) => ex.name.toLowerCase().includes(search.toLowerCase()))
    : category.exercises

  const handleLegendClick = (e: any) => {
    const name = e?.value ?? e
    if (typeof name === 'string') {
      setHighlighted(highlighted === name ? null : name)
    }
  }

  const lineProps = (exName: string) => {
    if (!highlighted) return { strokeWidth: 2.5, opacity: 1 }
    return exName === highlighted
      ? { strokeWidth: 3.5, opacity: 1 }
      : { strokeWidth: 1.5, opacity: 0.15 }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-lg">{category.name}</h3>
        {hasData && category.exercises.length > 1 && (
          <div className="relative">
            <input
              type="text"
              placeholder="Übung hervorheben…"
              value={highlighted ?? search}
              onChange={(e) => {
                const v = e.target.value
                setSearch(v)
                setHighlighted(null)
                setShowDropdown(true)
              }}
              onFocus={() => setShowDropdown(true)}
              onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
              className="text-xs border border-gray-300 rounded-md px-2.5 py-1.5 w-48 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
            />
            {highlighted && (
              <button
                onClick={() => { setHighlighted(null); setSearch('') }}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm"
              >
                ✕
              </button>
            )}
            {showDropdown && search && filtered.length > 0 && (
              <div className="absolute z-10 mt-1 w-48 bg-white border border-gray-200 rounded-md shadow-lg max-h-40 overflow-y-auto">
                {filtered.map((ex) => (
                  <button
                    key={ex.id}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      setHighlighted(ex.name)
                      setSearch('')
                      setShowDropdown(false)
                    }}
                    className="block w-full text-left px-3 py-1.5 text-xs hover:bg-blue-50 transition-colors"
                  >
                    {ex.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      {!hasData ? (
        <p className="text-gray-500 text-sm">Mindestens 2 Trainingstage erforderlich</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-xs text-gray-500 uppercase tracking-wide mb-2">Gewicht (kg)</h4>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tickFormatter={formatDateShort} tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} domain={['auto', 'auto']} />
                  <Tooltip labelFormatter={formatDateLong} formatter={(v: number, name: string) => [`${v} kg`, name]} />
                  <Legend
                    onClick={handleLegendClick}
                    formatter={(value: string) => (
                      <span className={`text-xs cursor-pointer ${highlighted && value !== highlighted ? 'text-gray-300' : ''}`}>
                        {value}
                      </span>
                    )}
                    wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
                  />
                  {category.exercises.map((ex, i) => {
                    const lp = lineProps(ex.name)
                    return (
                      <Line key={ex.id} type="monotone" dataKey={`w_${ex.id}`} name={ex.name}
                        stroke={COLORS[i % COLORS.length]} strokeWidth={lp.strokeWidth}
                        dot={{ r: highlighted === ex.name ? 5 : highlighted ? 0 : 4 }}
                        activeDot={{ r: 6 }} connectNulls={false}
                        style={{ opacity: lp.opacity }} />
                    )
                  })}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div>
            <h4 className="font-medium text-xs text-gray-500 uppercase tracking-wide mb-2">Wiederholungen</h4>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tickFormatter={formatDateShort} tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} domain={['auto', 'auto']} />
                  <Tooltip labelFormatter={formatDateLong} formatter={(v: number, name: string) => [v, name]} />
                  <Legend
                    onClick={handleLegendClick}
                    formatter={(value: string) => (
                      <span className={`text-xs cursor-pointer ${highlighted && value !== highlighted ? 'text-gray-300' : ''}`}>
                        {value}
                      </span>
                    )}
                    wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
                  />
                  {category.exercises.map((ex, i) => {
                    const lp = lineProps(ex.name)
                    return (
                      <Line key={ex.id} type="monotone" dataKey={`r_${ex.id}`} name={ex.name}
                        stroke={COLORS[i % COLORS.length]} strokeWidth={lp.strokeWidth}
                        dot={{ r: highlighted === ex.name ? 5 : highlighted ? 0 : 4 }}
                        activeDot={{ r: 6 }} connectNulls={false}
                        style={{ opacity: lp.opacity }} />
                    )
                  })}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ──────────────────────────────────────────────
// Main Dashboard
// ──────────────────────────────────────────────

export default function Dashboard() {
  const navigate = useNavigate()
  const [categories, setCategories] = useState<DashboardCategoryData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [variant, setVariant] = useState<Variant>('original')

  useEffect(() => {
    api.getAllProgress().then((rows: AllProgressRow[]) => {
      setCategories(groupProgressByCategory(rows))
      setLoading(false)
    }).catch((err) => {
      setError(err instanceof Error ? err.message : 'Fehler beim Laden der Daten')
      setLoading(false)
    })
  }, [])

  if (loading) return <div className="p-4 text-center">Laden...</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Dashboard</h2>
        <FormButton onClick={() => navigate('/trainings/new')}>+ Training</FormButton>
      </div>

      <ErrorBanner message={error} />

      {categories.length > 0 && (
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit overflow-x-auto">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setVariant(t.key)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${
                variant === t.key
                  ? 'bg-white shadow text-blue-700'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <span className="mr-1">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>
      )}

      {categories.length === 0 ? (
        <EmptyState
          icon="💪"
          message="Noch keine Trainingsdaten vorhanden"
          ctaText="Erstes Training eintragen"
          onCtaClick={() => navigate('/trainings/new')}
        />
      ) : (
        <div className="space-y-6">
          {variant === 'original' && categories.map((cat) => <OriginalSection key={cat.id} category={cat} />)}
          {variant === 'dual' && categories.map((cat) => <DualAxisSection key={cat.id} category={cat} />)}
        </div>
      )}
    </div>
  )
}
