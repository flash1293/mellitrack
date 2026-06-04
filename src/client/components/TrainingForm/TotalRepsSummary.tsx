import type { FormSet } from '../../../shared/types'

interface TotalRepsSummaryProps {
  sets: FormSet[]
}

function getTotalRepsSum(sets: FormSet[], field: 'reps' | 'previous_reps'): number {
  return sets.reduce((sum, set) => {
    const val = parseFloat(set[field])
    return sum + (isNaN(val) ? 0 : val)
  }, 0)
}

function getTotalComparisonColor(sets: FormSet[]): string {
  const currentTotal = getTotalRepsSum(sets, 'reps')
  const previousTotal = getTotalRepsSum(sets, 'previous_reps')
  if (currentTotal === 0 && previousTotal === 0) return ''
  if (currentTotal > previousTotal) return 'bg-green-100'
  if (currentTotal < previousTotal) return 'bg-red-100'
  return 'bg-yellow-100'
}

export default function TotalRepsSummary({ sets }: TotalRepsSummaryProps) {
  if (sets.length === 0) return null

  const currentTotal = getTotalRepsSum(sets, 'reps')
  const previousTotal = getTotalRepsSum(sets, 'previous_reps')

  return (
    <div className="flex items-center gap-2 pt-2 border-t border-gray-200">
      <span className="text-sm font-medium text-gray-500 shrink-0">∑</span>
      <span className={`px-3 py-1.5 rounded-lg font-medium text-sm ${getTotalComparisonColor(sets)}`}>
        {currentTotal} Wiederholungen
      </span>
      {previousTotal > 0 && (
        <span className="text-xs text-gray-400">
          (vorher: {previousTotal})
        </span>
      )}
    </div>
  )
}
