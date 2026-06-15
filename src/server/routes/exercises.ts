import { Hono } from 'hono'
import type { Env, Variables } from '../index'
import type { ExerciseWithCategories } from '../../shared/types'
import {
  validateString,
  validateNumberArray,
  validateOptionalNumberArray,
} from '../validate'

const app = new Hono<{ Bindings: Env; Variables: Variables }>()

// Helper type for the raw DB row from the JOIN query
interface ExerciseRow {
  id: number
  name: string
  deleted_at: string | null
  category_names: string | null
  category_ids: string | null
  category_sort_orders: string | null
}

app.get('/', async (c) => {
  const db = c.env.DB
  const userId = c.get('userId')
  const { results } = await db.prepare(`
    SELECT e.id, e.name, e.deleted_at,
      json_group_array(CASE WHEN c.id IS NOT NULL THEN c.name END) as category_names,
      json_group_array(CASE WHEN c.id IS NOT NULL THEN c.id END) as category_ids,
      json_group_array(CASE WHEN c.id IS NOT NULL THEN m.sort_order END) as category_sort_orders
    FROM exercises e
    LEFT JOIN exercise_category_mappings m ON e.id = m.exercise_id
    LEFT JOIN exercise_categories c ON m.category_id = c.id
    WHERE e.user_id = ?
    GROUP BY e.id, e.name, e.deleted_at
    ORDER BY e.name
  `).bind(userId).all()

  const exercises: ExerciseWithCategories[] = (results as unknown as ExerciseRow[]).map((r) => {
    const rawIds = JSON.parse(r.category_ids || '[]') as (number | null)[]
    const rawNames = JSON.parse(r.category_names || '[]') as (string | null)[]
    const rawSortOrders = JSON.parse(r.category_sort_orders || '[]') as (number | null)[]
    // Filter out null entries from LEFT JOIN misses (exercises with no categories)
    // All three arrays are aligned — same length, same null positions
    const catIds: number[] = []
    const catNames: string[] = []
    const catSortOrders: number[] = []
    for (let i = 0; i < rawIds.length; i++) {
      if (rawIds[i] !== null && rawNames[i] !== null) {
        catIds.push(rawIds[i]!)
        catNames.push(rawNames[i]!)
        catSortOrders.push(rawSortOrders[i] ?? 0)
      }
    }
    return {
      id: r.id,
      name: r.name,
      user_id: userId,
      deleted_at: r.deleted_at || null,
      sort_order: 0,
      categories: catIds.map((id: number, i: number) => ({
        id,
        name: catNames[i],
        sort_order: catSortOrders[i] ?? 0,
      })),
    }
  })
  return c.json(exercises)
})

app.post('/', async (c) => {
  const db = c.env.DB
  const userId = c.get('userId')
  const { name, category_ids }: { name: string; category_ids: number[] } = await c.req.json()

  // Validate
  const nameErr = validateString(name, 'name')
  if (nameErr) return c.json({ error: nameErr }, 400)
  const catErr = validateNumberArray(category_ids, 'category_ids')
  if (catErr) return c.json({ error: catErr }, 400)

  // Verify all categories belong to the user
  if (category_ids.length > 0) {
    const catCheck = await db.prepare(
      `SELECT COUNT(*) as count FROM exercise_categories WHERE id IN (${category_ids.map(() => '?').join(',')}) AND user_id = ?`
    ).bind(...category_ids, userId).first<{ count: number }>()
    if (!catCheck || catCheck.count !== category_ids.length) {
      return c.json({ error: 'One or more categories not found' }, 404)
    }
  }

  const { meta } = await db.prepare(
    'INSERT INTO exercises (name, user_id) VALUES (?, ?)'
  ).bind(name, userId).run()
  const exerciseId = meta.last_row_id

  for (const catId of category_ids) {
    // Get the next sort_order for this category
    const maxSort = await db.prepare(
      'SELECT COALESCE(MAX(m.sort_order), -1) + 1 as next_sort FROM exercise_category_mappings m WHERE m.category_id = ?'
    ).bind(catId).first<{ next_sort: number }>()
    await db.prepare(
      'INSERT OR IGNORE INTO exercise_category_mappings (exercise_id, category_id, sort_order) VALUES (?, ?, ?)'
    ).bind(exerciseId, catId, maxSort?.next_sort ?? 0).run()
  }

  return c.json({ id: exerciseId, success: true })
})

// ⚠️ Specific routes MUST be defined before parameterized ones
// (e.g. PUT /reorder before PUT /:id, otherwise "reorder" gets caught as an :id parameter → 404)
app.put('/reorder', async (c) => {
  const db = c.env.DB
  const userId = c.get('userId')
  const { ids, category_id }: { ids: number[]; category_id: number } = await c.req.json()

  const idsErr = validateNumberArray(ids, 'ids')
  if (idsErr) return c.json({ error: idsErr }, 400)
  if (!category_id || typeof category_id !== 'number') {
    return c.json({ error: 'category_id is required' }, 400)
  }

  // Verify the category belongs to the user
  const cat = await db.prepare(
    'SELECT id FROM exercise_categories WHERE id = ? AND user_id = ?'
  ).bind(category_id, userId).first()
  if (!cat) return c.json({ error: 'Category not found' }, 404)

  // Verify all exercise_ids are mapped to this category
  if (ids.length > 0) {
    const mappedCheck = await db.prepare(
      `SELECT COUNT(*) as count FROM exercise_category_mappings WHERE category_id = ? AND exercise_id IN (${ids.map(() => '?').join(',')})`
    ).bind(category_id, ...ids).first<{ count: number }>()
    if (!mappedCheck || mappedCheck.count !== ids.length) {
      return c.json({ error: 'Some exercises are not mapped to this category' }, 400)
    }
  }

  for (let i = 0; i < ids.length; i++) {
    await db.prepare(
      'UPDATE exercise_category_mappings SET sort_order = ? WHERE exercise_id = ? AND category_id = ?'
    ).bind(i, ids[i], category_id).run()
  }
  return c.json({ success: true })
})

app.put('/:id', async (c) => {
  const db = c.env.DB
  const userId = c.get('userId')
  const id = c.req.param('id')
  const { name, category_ids }: { name: string; category_ids?: number[] } = await c.req.json()

  // Validate
  const nameErr = validateString(name, 'name')
  if (nameErr) return c.json({ error: nameErr }, 400)
  const catErr = validateOptionalNumberArray(category_ids, 'category_ids')
  if (catErr) return c.json({ error: catErr }, 400)

  // Verify ownership
  const existing = await db.prepare('SELECT id FROM exercises WHERE id = ? AND user_id = ?').bind(id, userId).first()
  if (!existing) {
    return c.json({ error: 'Not found' }, 404)
  }

  await db.prepare('UPDATE exercises SET name = ? WHERE id = ?').bind(name, id).run()

  if (category_ids) {
    await db.prepare('DELETE FROM exercise_category_mappings WHERE exercise_id = ?').bind(id).run()
    for (const catId of category_ids) {
      const maxSort = await db.prepare(
        'SELECT COALESCE(MAX(m.sort_order), -1) + 1 as next_sort FROM exercise_category_mappings m WHERE m.category_id = ?'
      ).bind(catId).first<{ next_sort: number }>()
      await db.prepare(
        'INSERT OR IGNORE INTO exercise_category_mappings (exercise_id, category_id, sort_order) VALUES (?, ?, ?)'
      ).bind(id, catId, maxSort?.next_sort ?? 0).run()
    }
  }

  return c.json({ success: true })
})

app.delete('/:id', async (c) => {
  const db = c.env.DB
  const userId = c.get('userId')
  const id = c.req.param('id')

  const existing = await db.prepare(
    'SELECT id FROM exercises WHERE id = ? AND user_id = ?'
  ).bind(id, userId).first()
  if (!existing) {
    return c.json({ error: 'Not found' }, 404)
  }

  const ref = await db.prepare(
    'SELECT id FROM training_exercises WHERE exercise_id = ? LIMIT 1'
  ).bind(id).first()

  if (ref) {
    await db.prepare(
      'UPDATE exercises SET deleted_at = datetime("now") WHERE id = ?'
    ).bind(id).run()
    return c.json({ success: true, deleted: 'soft' })
  } else {
    await db.prepare(
      'DELETE FROM exercise_category_mappings WHERE exercise_id = ?'
    ).bind(id).run()
    await db.prepare(
      'DELETE FROM exercises WHERE id = ?'
    ).bind(id).run()
    return c.json({ success: true, deleted: 'hard' })
  }
})

app.get('/categories', async (c) => {
  const db = c.env.DB
  const userId = c.get('userId')
  const { results } = await db.prepare(
    'SELECT * FROM exercise_categories WHERE user_id = ? ORDER BY sort_order, name'
  ).bind(userId).all()
  return c.json(results)
})

app.put('/categories/reorder', async (c) => {
  const db = c.env.DB
  const userId = c.get('userId')
  const { ids }: { ids: number[] } = await c.req.json()

  const idsErr = validateNumberArray(ids, 'ids')
  if (idsErr) return c.json({ error: idsErr }, 400)

  for (let i = 0; i < ids.length; i++) {
    await db.prepare(
      'UPDATE exercise_categories SET sort_order = ? WHERE id = ? AND user_id = ?'
    ).bind(i, ids[i], userId).run()
  }
  return c.json({ success: true })
})

app.post('/categories', async (c) => {
  const db = c.env.DB
  const userId = c.get('userId')
  const { name }: { name: string } = await c.req.json()

  const nameErr = validateString(name, 'name')
  if (nameErr) return c.json({ error: nameErr }, 400)

  const { success } = await db.prepare(
    'INSERT INTO exercise_categories (name, user_id, sort_order) VALUES (?, ?, (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM exercise_categories WHERE user_id = ?))'
  ).bind(name, userId, userId).run()
  return c.json({ success })
})

app.get('/by-category/:categoryId', async (c) => {
  const db = c.env.DB
  const userId = c.get('userId')
  const categoryId = c.req.param('categoryId')
  const { results } = await db.prepare(`
    SELECT e.id, e.name
    FROM exercises e
    JOIN exercise_category_mappings m ON e.id = m.exercise_id
    WHERE m.category_id = ? AND e.user_id = ? AND e.deleted_at IS NULL
    ORDER BY m.sort_order, e.name
  `).bind(categoryId, userId).all()
  return c.json(results)
})

export default app
