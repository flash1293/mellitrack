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
  ResponsiveContainer, Legend, AreaChart, Area,
} from 'recharts'
import type { AllProgressRow, DashboardCategoryData } from '../../shared/types'

// ──────────────────────────────────────────────
// Shared config
// ──────────────────────────────────────────────

const COLORS = [
  '#2563eb', '#dc2626', '#16a34a', '#d97706',
  '#9333ea', '#0891b2', '#be123c', '#059669',
]

type Variant = 'dual' | 'cards' | 'area'

const tabs: { key: Variant; label: string; icon: string }[] = [
  { key: 'dual', label: 'Dual-Achse', icon: '📈' },
  { key: 'cards', label: 'Karten', icon: '🃏' },
  { key: 'area', label: 'Fläche', icon: '🏔️' },
]

// ──────────────────────────────────────────────
// Variant 1: Dual-Axis combined chart
// ──────────────────────────────────────────────

function DualAxisSection({ category }: { category: DashboardCategoryData }) {
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

  return (
    <div className="bg-white rounded-xl shadow-sm p-4">
      <h3 className="font-semibold text-lg mb-3">{category.name}</h3>
      {!hasData ? (
        <p className="text-gray-500 text-sm">Mindestens 2 Trainingstage erforderlich</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Weight (left axis) */}
          <div>
            <h4 className="font-medium text-xs text-gray-500 uppercase tracking-wide mb-1">Gewicht (kg)</h4>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tickFormatter={formatDateShort} tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} domain={['auto', 'auto']} />
                  <Tooltip labelFormatter={formatDateLong} formatter={(v: number) => [`${v} kg`, '']} />
                  {category.exercises.map((ex, i) => (
                    <Line
                      key={ex.id}
                      type="monotone"
                      dataKey={`w_${ex.id}`}
                      name={ex.name}
                      stroke={COLORS[i % COLORS.length]}
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      connectNulls={false}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          {/* Reps (right axis) */}
          <div>
            <h4 className="font-medium text-xs text-gray-500 uppercase tracking-wide mb-1">Wiederholungen</h4>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tickFormatter={formatDateShort} tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} domain={['auto', 'auto']} />
                  <Tooltip labelFormatter={formatDateLong} formatter={(v: number) => [v, '']} />
                  {category.exercises.map((ex, i) => (
                    <Line
                      key={ex.id}
                      type="monotone"
                      dataKey={`r_${ex.id}`}
                      name={ex.name}
                      stroke={COLORS[i % COLORS.length]}
                      strokeWidth={2}
                      dot={{ r: 3 }}
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

// ──────────────────────────────────────────────
// Variant 2: Card grid with sparklines
// ──────────────────────────────────────────────

function trendEmoji(current: number, previous: number): string {
  if (previous === 0 || current === 0) return '➖'
  const pct = ((current - previous) / previous) * 100
  if (pct > 10) return '🚀'
  if (pct > 3) return '📈'
  if (pct > -3) return '➡️'
  if (pct > -10) return '📉'
  return '🔻'
}

function Sparkline({ data, dataKey, color }: { data: Record<string, any>[]; dataKey: string; color: string }) {
  const values = data.map((d) => Number(d[dataKey])).filter((v) => !isNaN(v) && v !== null)
  if (values.length < 2) return <div className="h-10" />

  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const width = 120
  const height = 40
  const points = values.map((v, i) => `${(i / (values.length - 1)) * width},${height - ((v - min) / range) * height}`).join(' ')

  return (
    <svg width={width} height={height} className="block mx-auto">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {values.map((v, i) => (
        <circle
          key={i}
          cx={(i / (values.length - 1)) * width}
          cy={height - ((v - min) / range) * height}
          r={2.5}
          fill={color}
        />
      ))}
    </svg>
  )
}

function CardsSection({ category }: { category: DashboardCategoryData }) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-4">
      <h3 className="font-semibold text-lg mb-4">{category.name}</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {category.exercises.map((ex, i) => {
          const rows = [...ex.rows].sort((a, b) => a.date.localeCompare(b.date))
          const current = rows.length > 0 ? rows[rows.length - 1].max_weight : 0
          const previous = rows.length > 1 ? rows[rows.length - 2].max_weight : current
          const color = COLORS[i % COLORS.length]
          const sparkData = rows.map((r) => ({
            date: r.date,
            w: r.max_weight,
          }))

          return (
            <div
              key={ex.id}
              className="border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-sm truncate" title={ex.name}>
                  {ex.name}
                </span>
                <span className="text-lg">{trendEmoji(current, previous)}</span>
              </div>
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-2xl font-bold" style={{ color }}>
                  {current > 0 ? `${current}` : '–'}
                </span>
                <span className="text-xs text-gray-500">{current > 0 ? 'kg max' : ''}</span>
                {previous > 0 && current !== previous && (
                  <span className={`text-xs ml-1 ${current > previous ? 'text-green-600' : 'text-red-600'}`}>
                    {current > previous ? '+' : ''}{previous > 0 ? (((current - previous) / previous) * 100).toFixed(0) : '–'}%
                  </span>
                )}
              </div>
              <Sparkline data={sparkData} dataKey="w" color={color} />
              <div className="text-xs text-gray-400 mt-1 text-center">
                {rows.length} Trainingstage
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────
// Variant 3: Area chart (volume)
// ──────────────────────────────────────────────

function AreaSection({ category }: { category: DashboardCategoryData }) {
  // volume = max_weight * total_reps per exercise per date
  const data = category.dates.map((date) => {
    const point: Record<string, string | number | null> = { date }
    category.exercises.forEach((ex) => {
      const row = ex.rows.find((r) => r.date === date)
      point[`v_${ex.id}`] = row ? Math.round(row.max_weight * row.total_reps) : null
    })
    return point
  })

  const hasData = category.dates.length >= 2

  return (
    <div className="bg-white rounded-xl shadow-sm p-4">
      <h3 className="font-semibold text-lg mb-3">{category.name}</h3>
      {!hasData ? (
        <p className="text-gray-500 text-sm">Mindestens 2 Trainingstage erforderlich</p>
      ) : (
        <div>
          <h4 className="font-medium text-xs text-gray-500 uppercase tracking-wide mb-1">
            Volumen (kg × Wiederholungen)
          </h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tickFormatter={formatDateShort} tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  labelFormatter={formatDateLong}
                  formatter={(v: number) => [v.toLocaleString(), '']}
                />
                <Legend />
                {category.exercises.map((ex, i) => (
                  <Area
                    key={ex.id}
                    type="monotone"
                    dataKey={`v_${ex.id}`}
                    name={ex.name}
                    stroke={COLORS[i % COLORS.length]}
                    fill={COLORS[i % COLORS.length]}
                    fillOpacity={0.15}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    connectNulls={false}
                    stackId="1"
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            Gestapelte Flächen zeigen das Gesamtvolumen pro Trainingstag. Je höher die Fläche, desto mehr Gesamtarbeit.
          </p>
        </div>
      )}
    </div>
  )
}

// ──────────────────────────────────────────────
// Main page
// ──────────────────────────────────────────────

export default function DashboardTest() {
  const navigate = useNavigate()
  const [categories, setCategories] = useState<DashboardCategoryData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [variant, setVariant] = useState<Variant>('dual')

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
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold">Dashboard — Testvarianten</h2>
          <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">Vorschau</span>
        </div>
        <div className="flex gap-2">
          <FormButton onClick={() => navigate('/')} variant="secondary">
            ← Original
          </FormButton>
          <FormButton onClick={() => navigate('/trainings/new')}>
            + Training
          </FormButton>
        </div>
      </div>

      <ErrorBanner message={error} />

      {/* Variant tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setVariant(t.key)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              variant === t.key
                ? 'bg-white shadow text-blue-700'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <span className="mr-1.5">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {categories.length === 0 ? (
        <EmptyState
          icon="💪"
          message="Noch keine Trainingsdaten vorhanden"
          ctaText="Erstes Training eintragen"
          onCtaClick={() => navigate('/trainings/new')}
        />
      ) : (
        <div className="space-y-6">
          {variant === 'dual' &&
            categories.map((cat) => <DualAxisSection key={cat.id} category={cat} />)}

          {variant === 'cards' &&
            categories.map((cat) => <CardsSection key={cat.id} category={cat} />)}

          {variant === 'area' &&
            categories.map((cat) => <AreaSection key={cat.id} category={cat} />)}
        </div>
      )}
    </div>
  )
}
