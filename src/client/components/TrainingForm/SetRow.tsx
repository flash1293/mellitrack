import type { FormSet } from '../../../shared/types'

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

export default function SetRow({ set, onUpdate, onBlur, onRemove }: SetRowProps) {
  return (
    <div className="grid grid-cols-[auto_minmax(0,1fr)_auto_minmax(0,1fr)_auto] gap-1 items-center">
      <span className="text-sm text-gray-500 shrink-0">S{set.set_number}</span>
      <input
        type="number"
        inputMode="decimal"
        placeholder="kg"
        value={set.weight}
        onChange={(e) => onUpdate('weight', e.target.value)}
        onBlur={() => onBlur('weight')}
        style={{ minWidth: 0, width: '100%' }}
        className={`px-2 py-2 rounded-lg border outline-none transition-colors ${
          getComparisonColor(set.weight, set.previous_weight)
        } ${
          isChanged(set, 'weight') || isTouched(set, 'weight')
            ? 'border-l-4 border-l-blue-500 border-gray-300'
            : 'border-gray-300'
        }`}
      />
      <span className="text-lg shrink-0">⚖️</span>
      <input
        type="number"
        inputMode="numeric"
        placeholder="Wdh"
        value={set.reps}
        onChange={(e) => onUpdate('reps', e.target.value)}
        onBlur={() => onBlur('reps')}
        style={{ minWidth: 0, width: '100%' }}
        className={`px-2 py-2 rounded-lg border outline-none transition-colors ${
          getComparisonColor(set.reps, set.previous_reps)
        } ${
          isChanged(set, 'reps') || isTouched(set, 'reps')
            ? 'border-l-4 border-l-blue-500 border-gray-300'
            : 'border-gray-300'
        }`}
      />
      <span className="text-lg shrink-0">🔁</span>
      <button
        onClick={onRemove}
        className="p-2 text-gray-400 hover:text-red-500 transition-colors shrink-0"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </div>
  )
}
