import type { FormExerciseEntry } from '../../../shared/types'
import SetRow from './SetRow'
import TotalRepsSummary from './TotalRepsSummary'
import FormButton from '../ui/FormButton'

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
          <FormButton
            variant="ghost"
            onClick={() => onRemoveExercise(entryIndex)}
            className="p-2 text-red-500"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </FormButton>
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

      <FormButton
        variant="secondary"
        onClick={() => onAddSet(entryIndex)}
        className="w-full py-2 text-sm text-blue-600 border-blue-200 hover:bg-blue-50"
      >
        + Satz hinzufügen
      </FormButton>
    </div>
  )
}
