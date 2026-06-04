import { Hono } from 'hono'
import type { Env, Variables } from '../index'
import type { ExerciseWithCategories } from '../../shared/types'

const app = new Hono<{ Bindings: Env; Variables: Variables }>()

// Helper type for the raw DB row from the JOIN query
interface ExerciseRow {
  id: number
  name: string
  deleted_at: string | null
  category_names: string | null
  category_ids: string | null
}

app.get('/', async (c) => {
  const db = c.env.DB
  const userId = c.get('userId')
  const { results } = await db.prepare(`
    SELECT e.id, e.name, e.deleted_at, GROUP_CONCAT(c.name) as category_names, GROUP_CONCAT(c.id) as category_ids
    FROM exercises e
    LEFT JOIN exercise_category_mappings m ON e.id = m.exercise_id
    LEFT JOIN exercise_categories c ON m.category_id = c.id
    WHERE e.user_id = ?
    GROUP BY e.id, e.name, e.deleted_at
    ORDER BY e.sort_order, e.name
  `).bind(userId).all()

  const exercises: ExerciseWithCategories[] = (results as unknown as ExerciseRow[]).map((r) => ({
    id: r.id,
    name: r.name,
    category_id: null,
    user_id: userId,
    deleted_at: r.deleted_at || null,
    sort_order: 0,
    categories: r.category_ids
      ? r.category_ids.split(',').map((id: string, i: number) => ({
          id: parseInt(id),
          name: r.category_names!.split(',')[i],
        }))
      : [],
  }))
  return c.json(exercises)
})

app.post('/', async (c) => {
  const db = c.env.DB
  const userId = c.get('userId')
  const { name, category_ids }: { name: string; category_ids: number[] } = await c.req.json()

  const { meta } = await db.prepare(
    'INSERT INTO exercises (name, category_id, user_id, sort_order) VALUES (?, ?, ?, (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM exercises WHERE user_id = ?))'
  ).bind(name, category_ids[0] || 1, userId, userId).run()
  const exerciseId = meta.last_row_id

  for (const catId of category_ids) {
    await db.prepare(
      'INSERT OR IGNORE INTO exercise_category_mappings (exercise_id, category_id) VALUES (?, ?)'
    ).bind(exerciseId, catId).run()
  }

  return c.json({ id: exerciseId, success: true })
})

// ⚠️ Specific routes MUST be defined before parameterized ones
// (e.g. PUT /reorder before PUT /:id, otherwise "reorder" gets caught as an :id parameter → 404)
app.put('/reorder', async (c) => {
  const db = c.env.DB
  const userId = c.get('userId')
  const { ids }: { ids: number[] } = await c.req.json()

  // Use db.batch() for atomic multi-statement execution (D1 doesn't support BEGIN/COMMIT)
  try {
    const stmts = ids.map((id, i) =>
      db.prepare('UPDATE exercises SET sort_order = ? WHERE id = ? AND user_id = ?')
        .bind(i, id, userId)
    )
    await db.batch(stmts)
    return c.json({ success: true })
  } catch (error) {
    return c.json({ error: 'Database error: reorder failed' }, 500)
  }
})

app.put('/:id', async (c) => {
  const db = c.env.DB
  const userId = c.get('userId')
  const id = c.req.param('id')
  const { name, category_ids }: { name: string; category_ids?: number[] } = await c.req.json()

  // Verify ownership
  const existing = await db.prepare('SELECT id FROM exercises WHERE id = ? AND user_id = ?').bind(id, userId).first()
  if (!existing) {
    return c.json({ error: 'Not found' }, 404)
  }

  await db.prepare('UPDATE exercises SET name = ? WHERE id = ?').bind(name, id).run()

  if (category_ids) {
    await db.prepare('DELETE FROM exercise_category_mappings WHERE exercise_id = ?').bind(id).run()
    for (const catId of category_ids) {
      await db.prepare(
        'INSERT OR IGNORE INTO exercise_category_mappings (exercise_id, category_id) VALUES (?, ?)'
      ).bind(id, catId).run()
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
    ORDER BY e.sort_order, e.name
  `).bind(categoryId, userId).all()
  return c.json(results)
})

export default app
