import type { FormSet } from '../../../shared/types'
import FormInput from '../ui/FormInput'
import FormButton from '../ui/FormButton'

interface SetRowProps {
  set: FormSet
  onUpdate: (field: 'weight' | 'reps', value: string) => void
  onBlur: (field: 'weight' | 'reps') => void
  onRemove: () => void
}

function getComparisonColor(currentValue: string, previousValue: string): string {
  if (!previousValue || !currentValue) return ''
  const current = parseFloat(currentValue)
  const previous = parseFloat(previousValue)
  if (isNaN(current) || isNaN(previous)) return ''
  if (current > previous) return 'bg-green-100'
  if (current < previous) return 'bg-red-100'
  return 'bg-yellow-100'
}

function isChanged(set: FormSet, field: 'weight' | 'reps') {
  return set[field] !== (field === 'weight' ? set.prefilled_weight : set.prefilled_reps)
}

function isTouched(set: FormSet, field: 'weight' | 'reps') {
  return field === 'weight' ? set.touchedWeight : set.touchedReps
}

function inputClasses(set: FormSet, field: 'weight' | 'reps') {
  const compareField = field === 'weight' ? 'previous_weight' : 'previous_reps'
  return `${getComparisonColor(set[field], set[compareField])} ${
    isChanged(set, field) || isTouched(set, field)
      ? 'border-l-4 border-l-blue-500 !border-gray-300'
      : ''
  }`
}

export default function SetRow({ set, onUpdate, onBlur, onRemove }: SetRowProps) {
  return (
    <div className="grid grid-cols-[auto_minmax(0,1fr)_auto_minmax(0,1fr)_auto] gap-1 items-center">
      <span className="text-sm text-gray-500 shrink-0">S{set.set_number}</span>
      <FormInput
        type="number"
        inputMode="decimal"
        placeholder="kg"
        value={set.weight}
        onChange={(e) => onUpdate('weight', e.target.value)}
        onBlur={() => onBlur('weight')}
        className={`px-2 py-2 ${inputClasses(set, 'weight')}`}
      />
      <span className="text-lg shrink-0">⚖️</span>
      <FormInput
        type="number"
        inputMode="numeric"
        placeholder="Wdh"
        value={set.reps}
        onChange={(e) => onUpdate('reps', e.target.value)}
        onBlur={() => onBlur('reps')}
        className={`px-2 py-2 ${inputClasses(set, 'reps')}`}
      />
      <span className="text-lg shrink-0">🔁</span>
      <FormButton
        variant="ghost"
        onClick={onRemove}
        className="p-2 text-gray-400"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </FormButton>
    </div>
  )
}
