import { describe, it, expect } from 'vitest'
import { groupProgressByCategory } from './grouping'
import type { AllProgressRow } from '../../shared/types'

const mockRows: AllProgressRow[] = [
  {
    category_id: 1,
    category_name: 'Upper Body',
    exercise_id: 10,
    exercise_name: 'Bench Press',
    date: '2024-05-15',
    max_weight: 80,
    total_reps: 30,
  },
  {
    category_id: 1,
    category_name: 'Upper Body',
    exercise_id: 10,
    exercise_name: 'Bench Press',
    date: '2024-05-22',
    max_weight: 85,
    total_reps: 28,
  },
  {
    category_id: 1,
    category_name: 'Upper Body',
    exercise_id: 11,
    exercise_name: 'Overhead Press',
    date: '2024-05-15',
    max_weight: 50,
    total_reps: 25,
  },
  {
    category_id: 2,
    category_name: 'Lower Body',
    exercise_id: 20,
    exercise_name: 'Squat',
    date: '2024-05-16',
    max_weight: 120,
    total_reps: 20,
  },
]

describe('groupProgressByCategory', () => {
  it('groups rows by category', () => {
    const result = groupProgressByCategory(mockRows)
    expect(result).toHaveLength(2)
    expect(result[0].name).toBe('Upper Body')
    expect(result[1].name).toBe('Lower Body')
  })

  it('groups exercises within each category', () => {
    const result = groupProgressByCategory(mockRows)
    const upperBody = result.find((c) => c.name === 'Upper Body')!
    expect(upperBody.exercises).toHaveLength(2)
    expect(upperBody.exercises.map((e) => e.name)).toContain('Bench Press')
    expect(upperBody.exercises.map((e) => e.name)).toContain('Overhead Press')
  })

  it('collects unique dates per category in sorted order', () => {
    const result = groupProgressByCategory(mockRows)
    const upperBody = result.find((c) => c.name === 'Upper Body')!
    expect(upperBody.dates).toEqual(['2024-05-15', '2024-05-22'])
  })

  it('preserves all row data for each exercise', () => {
    const result = groupProgressByCategory(mockRows)
    const upperBody = result.find((c) => c.name === 'Upper Body')!
    const benchPress = upperBody.exercises.find((e) => e.name === 'Bench Press')!
    expect(benchPress.rows).toHaveLength(2)
    expect(benchPress.rows[0].max_weight).toBe(80)
    expect(benchPress.rows[1].max_weight).toBe(85)
  })

  it('handles empty input', () => {
    const result = groupProgressByCategory([])
    expect(result).toHaveLength(0)
  })

  it('handles single row', () => {
    const result = groupProgressByCategory([mockRows[0]])
    expect(result).toHaveLength(1)
    expect(result[0].exercises).toHaveLength(1)
    expect(result[0].dates).toEqual(['2024-05-15'])
  })
})
