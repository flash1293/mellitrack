import type { FormExerciseEntry } from '../../../shared/types'
import SetRow from './SetRow'
import TotalRepsSummary from './TotalRepsSummary'

interface ExerciseCardProps {
  entry: FormExerciseEntry
  entryIndex: number
  isEdit: boolean
  onUpdateSet: (entryIndex: number, setIndex: number, field: 'weight' | 'reps', value: string) => void
  onBlurSet: (entryIndex: number, setIndex: number, field: 'weight' | 'reps') => void
  onRemoveSet: (entryIndex: number, setIndex: number) => void
  onAddSet: (entryIndex: number) => void
  onRemoveExercise: (entryIndex: number) => void
}

export default function ExerciseCard({
  entry,
  entryIndex,
  isEdit,
  onUpdateSet,
  onBlurSet,
  onRemoveSet,
  onAddSet,
  onRemoveExercise,
}: ExerciseCardProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="font-medium">{entry.exercise_name}</span>
        {!isEdit && (
          <button
            onClick={() => onRemoveExercise(entryIndex)}
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
          <SetRow
            key={si}
            set={set}
            onUpdate={(field, value) => onUpdateSet(entryIndex, si, field, value)}
            onBlur={(field) => onBlurSet(entryIndex, si, field)}
            onRemove={() => onRemoveSet(entryIndex, si)}
          />
        ))}
      </div>

      <TotalRepsSummary sets={entry.sets} />

      <button
        onClick={() => onAddSet(entryIndex)}
        className="w-full py-2 text-sm text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
      >
        + Satz hinzufügen
      </button>
    </div>
  )
}
