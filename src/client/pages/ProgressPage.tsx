import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../api'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

export default function ProgressPage() {
  const { exerciseId } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState<any[]>([])
  const [exercise, setExercise] = useState<any>(null)

  useEffect(() => {
    if (!exerciseId) return
    api.getProgress(parseInt(exerciseId)).then((data: any[]) => setData(data))
    api.getExercises().then((exs: any[]) => {
      const ex = exs.find((e: any) => e.id === parseInt(exerciseId))
      setExercise(ex)
    })
  }, [exerciseId])

  if (!exercise) return <div className="p-4 text-center">Laden...</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <button
          onClick={() => navigate('/exercises')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h2 className="text-xl font-bold">{exercise.name}</h2>
      </div>

      {data.length < 2 ? (
        <div className="bg-white rounded-xl p-8 text-center shadow-sm">
          <p className="text-gray-500">Noch nicht genügend Daten für einen Chart</p>
          <p className="text-sm text-gray-400 mt-2">Mindestens 2 Trainingseinheiten nötig</p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl shadow-sm p-4">
            <h3 className="font-semibold mb-4">Gewichtsentwicklung</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(d) => new Date(d).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}
                  />
                  <YAxis />
                  <Tooltip
                    labelFormatter={(d) => new Date(d).toLocaleDateString('de-DE')}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="avg_weight" name="Ø Gewicht (kg)" stroke="#2563eb" strokeWidth={2} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="max_weight" name="Max Gewicht (kg)" stroke="#16a34a" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-4">
            <h3 className="font-semibold mb-4">Wiederholungen</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(d) => new Date(d).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}
                  />
                  <YAxis />
                  <Tooltip
                    labelFormatter={(d) => new Date(d).toLocaleDateString('de-DE')}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="total_reps" name="Gesamt Wdh." stroke="#9333ea" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <h3 className="font-semibold p-4 border-b border-gray-100">Historie</h3>
            <div className="divide-y divide-gray-100">
              {data.slice().reverse().map((d, i) => {
                const sets: { set_number: number; weight: number; reps: number }[] =
                  typeof d.sets === 'string' ? JSON.parse(d.sets) : d.sets || []
                return (
                  <div key={i} className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">
                        {new Date(d.date).toLocaleDateString('de-DE')}
                      </span>
                      <span className="text-xs text-gray-500">{d.category_name || '—'}</span>
                    </div>
                    <div className="grid grid-cols-[auto_1fr_1fr] gap-x-4 gap-y-1 text-sm">
                      <span className="text-gray-400 font-medium">Satz</span>
                      <span className="text-gray-400 font-medium">Gewicht</span>
                      <span className="text-gray-400 font-medium">Wdh.</span>
                      {sets.map((s) => (
                        <span key={`s${s.set_number}-n`} className="text-gray-500">{s.set_number}.</span>
                      ))}
                      {sets.map((s) => (
                        <span key={`s${s.set_number}-w`}>{s.weight > 0 ? `${s.weight} kg` : '—'}</span>
                      ))}
                      {sets.map((s) => (
                        <span key={`s${s.set_number}-r`}>{s.reps > 0 ? s.reps : '—'}</span>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
