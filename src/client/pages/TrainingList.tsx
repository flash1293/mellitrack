import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import FormButton from '../components/ui/FormButton'
import EmptyState from '../components/ui/EmptyState'
import ErrorBanner from '../components/ui/ErrorBanner'
import { formatDateFull } from '../utils/dates'
import type { TrainingListItem } from '../../shared/types'

export default function TrainingList() {
  const navigate = useNavigate()
  const [trainings, setTrainings] = useState<TrainingListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.getTrainings().then((data) => {
      setTrainings(data)
      setLoading(false)
    }).catch((err) => {
      setError(err instanceof Error ? err.message : 'Fehler beim Laden der Trainings')
      setLoading(false)
    })
  }, [])

  const handleDelete = async (id: number) => {
    if (!confirm('Training wirklich löschen?')) return
    try {
      await api.deleteTraining(id)
      setTrainings((prev) => prev.filter((t) => t.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Löschen')
    }
  }

  if (loading) return <div className="p-4 text-center">Laden...</div>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Trainings</h2>
        <FormButton onClick={() => navigate('/trainings/new')}>
          + Neues Training
        </FormButton>
      </div>

      <ErrorBanner message={error} />

      {trainings.length === 0 ? (
        <EmptyState
          message="Noch keine Trainings eingetragen"
          ctaText="Erstes Training eintragen"
          onCtaClick={() => navigate('/trainings/new')}
        />
      ) : (
        <div className="space-y-3">
          {trainings.map((t) => (
            <div
              key={t.id}
              className="bg-white rounded-xl shadow-sm p-4 flex items-center justify-between"
            >
              <div className="flex-1">
                <p className="font-medium">
                  {formatDateFull(t.date)}
                </p>
                <p className="text-sm text-gray-500">
                  {t.category_name || '—'} · {t.exercise_count} Übungen
                </p>
              </div>
              <div className="flex items-center gap-1">
                <FormButton
                  variant="ghost"
                  onClick={() => navigate(`/trainings/${t.id}/edit`)}
                  className="p-2 text-gray-400"
                  aria-label="Bearbeiten"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </FormButton>
                <FormButton
                  variant="ghost"
                  onClick={() => handleDelete(t.id)}
                  className="p-2 text-red-500"
                  aria-label="Löschen"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </FormButton>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
