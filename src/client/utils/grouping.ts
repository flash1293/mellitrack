import type {
  AllProgressRow,
  DashboardCategoryData,
} from '../../shared/types'

export function groupProgressByCategory(
  rows: AllProgressRow[]
): DashboardCategoryData[] {
  const grouped = new Map<number, DashboardCategoryData>()

  for (const row of rows) {
    if (!grouped.has(row.category_id)) {
      grouped.set(row.category_id, {
        id: row.category_id,
        name: row.category_name,
        exercises: [],
        dates: [],
      })
    }

    const cat = grouped.get(row.category_id)!
    let ex = cat.exercises.find((e) => e.id === row.exercise_id)

    if (!ex) {
      ex = { id: row.exercise_id, name: row.exercise_name, rows: [] }
      cat.exercises.push(ex)
    }

    ex.rows.push(row)

    if (!cat.dates.includes(row.date)) {
      cat.dates.push(row.date)
    }
  }

  for (const cat of grouped.values()) {
    cat.dates.sort()
  }

  return Array.from(grouped.values())
}
