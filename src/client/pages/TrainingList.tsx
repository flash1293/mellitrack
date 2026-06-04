import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import type { TrainingListItem } from '../../shared/types'

export default function TrainingList() {
  const navigate = useNavigate()
  const [trainings, setTrainings] = useState<TrainingListItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getTrainings().then((data) => {
      setTrainings(data)
      setLoading(false)
    })
  }, [])

  const handleDelete = async (id: number) => {
    if (!confirm('Training wirklich löschen?')) return
    await api.deleteTraining(id)
    setTrainings((prev) => prev.filter((t) => t.id !== id))
  }

  if (loading) return <div className="p-4 text-center">Laden...</div>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Trainings</h2>
        <button
          onClick={() => navigate('/trainings/new')}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 active:bg-blue-800 transition-colors"
        >
          + Neues Training
        </button>
      </div>

      {trainings.length === 0 ? (
        <div className="bg-white rounded-xl p-8 text-center shadow-sm">
          <p className="text-gray-500 mb-4">Noch keine Trainings eingetragen</p>
          <button
            onClick={() => navigate('/trainings/new')}
            className="text-blue-600 font-medium"
          >
            Erstes Training eintragen
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {trainings.map((t) => (
            <div
              key={t.id}
              className="bg-white rounded-xl shadow-sm p-4 flex items-center justify-between"
            >
              <div className="flex-1">
                <p className="font-medium">
                  {new Date(t.date).toLocaleDateString('de-DE', {
                    weekday: 'short',
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </p>
                <p className="text-sm text-gray-500">
                  {t.category_name || '—'} · {t.exercise_count} Übungen
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => navigate(`/trainings/${t.id}/edit`)}
                  className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  aria-label="Bearbeiten"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  onClick={() => handleDelete(t.id)}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  aria-label="Löschen"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
