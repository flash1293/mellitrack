import { Hono } from 'hono'
import type { Env, Variables } from '../index'

const app = new Hono<{ Bindings: Env; Variables: Variables }>()

app.get('/', async (c) => {
  const db = c.env.DB
  const userId = c.get('userId')
  const { results } = await db.prepare(`
    SELECT t.id, t.date, t.category_id, c.name as category_name, COUNT(DISTINCT te.id) as exercise_count
    FROM trainings t
    LEFT JOIN training_exercises te ON t.id = te.training_id
    LEFT JOIN exercise_categories c ON t.category_id = c.id
    WHERE t.user_id = ?
    GROUP BY t.id, t.date, t.category_id, c.name
    ORDER BY t.date DESC
  `).bind(userId).all()
  return c.json(results)
})

app.get('/:id', async (c) => {
  const db = c.env.DB
  const userId = c.get('userId')
  const id = c.req.param('id')

  const training = await db.prepare(`
    SELECT t.*, c.name as category_name
    FROM trainings t
    LEFT JOIN exercise_categories c ON t.category_id = c.id
    WHERE t.id = ? AND t.user_id = ?
  `).bind(id, userId).first()

  if (!training) return c.json({ error: 'Not found' }, 404)

  // Find the previous training in the same category
  const previousTraining = await db.prepare(`
    SELECT id FROM trainings
    WHERE category_id = ? AND user_id = ? AND (date < ? OR (date = ? AND id < ?))
    ORDER BY date DESC, id DESC
    LIMIT 1
  `).bind(training.category_id, userId, training.date, training.date, id).first()

  const { results: exercises } = await db.prepare(`
    SELECT te.id, te.exercise_id, e.name as exercise_name
    FROM training_exercises te
    JOIN exercises e ON te.exercise_id = e.id
    WHERE te.training_id = ?
    ORDER BY te.id
  `).bind(id).all()

  for (const ex of exercises) {
    const { results: sets } = await db.prepare(`
      SELECT id, set_number, weight, reps
      FROM sets
      WHERE training_exercise_id = ?
      ORDER BY set_number
    `).bind(ex.id).all()
    ex.sets = sets

    // Get previous training's sets for this exercise (for comparison)
    if (previousTraining) {
      const { results: prevSets } = await db.prepare(`
        SELECT s.set_number, s.weight, s.reps
        FROM sets s
        JOIN training_exercises te ON s.training_exercise_id = te.id
        WHERE te.training_id = ? AND te.exercise_id = ?
        ORDER BY s.set_number
      `).bind(previousTraining.id, ex.exercise_id).all()
      ex.previous_sets = prevSets || []
    } else {
      ex.previous_sets = []
    }
  }

  return c.json({ ...training, exercises })
})

app.get('/last-set/:exerciseId', async (c) => {
  const db = c.env.DB
  const userId = c.get('userId')
  const exerciseId = c.req.param('exerciseId')

  const result = await db.prepare(`
    SELECT s.weight, s.reps
    FROM sets s
    JOIN training_exercises te ON s.training_exercise_id = te.id
    JOIN trainings t ON te.training_id = t.id
    WHERE te.exercise_id = ? AND t.user_id = ?
    ORDER BY te.id DESC, s.set_number DESC
    LIMIT 1
  `).bind(exerciseId, userId).first()

  return c.json(result || { weight: null, reps: null })
})

app.get('/last-category/:categoryId', async (c) => {
  const db = c.env.DB
  const userId = c.get('userId')
  const categoryId = Number(c.req.param('categoryId'))

  // Return ALL exercises in the category, each with their last sets from a category training
  // Ordered by: last training's exercise order first, then alphabetically for new exercises
  const { results: exercises } = await db.prepare(`
    SELECT
      e.id as exercise_id,
      e.name as exercise_name,
      s.set_number,
      s.weight,
      s.reps,
      te_order.id as te_order_id
    FROM exercises e
    JOIN exercise_category_mappings m ON e.id = m.exercise_id
    LEFT JOIN (
      SELECT te.exercise_id, te.id
      FROM training_exercises te
      WHERE te.training_id = (
        SELECT t.id FROM trainings t
        WHERE t.category_id = ? AND t.user_id = ?
        ORDER BY t.date DESC, t.id DESC
        LIMIT 1
      )
    ) te_order ON te_order.exercise_id = e.id
    LEFT JOIN (
      SELECT
        te.exercise_id,
        MAX(te.id) as last_te_id
      FROM training_exercises te
      JOIN trainings t ON te.training_id = t.id
      WHERE t.category_id = ? AND t.user_id = ?
      GROUP BY te.exercise_id
    ) latest ON latest.exercise_id = e.id
    LEFT JOIN sets s ON s.training_exercise_id = latest.last_te_id
    WHERE m.category_id = ? AND e.user_id = ? AND e.deleted_at IS NULL
    ORDER BY
      CASE WHEN te_order.id IS NULL THEN 1 ELSE 0 END,
      e.sort_order,
      e.name,
      s.set_number
  `).bind(categoryId, userId, categoryId, userId, categoryId, userId).all()

  const grouped: Record<number, any> = {}
  for (const row of (exercises || []) as any[]) {
    if (!grouped[row.exercise_id]) {
      grouped[row.exercise_id] = {
        exercise_id: row.exercise_id,
        exercise_name: row.exercise_name,
        sets: []
      }
    }
    if (row.set_number) {
      grouped[row.exercise_id].sets.push({
        set_number: row.set_number,
        weight: row.weight,
        reps: row.reps
      })
    }
  }

  return c.json(Object.values(grouped))
})

app.put('/:id', async (c) => {
  const db = c.env.DB
  const userId = c.get('userId')
  const id = Number(c.req.param('id'))
  const body = await c.req.json()

  // Verify ownership
  const existing = await db.prepare('SELECT id FROM trainings WHERE id = ? AND user_id = ?').bind(id, userId).first()
  if (!existing) {
    return c.json({ error: 'Not found' }, 404)
  }

  await db.prepare('UPDATE trainings SET date = ?, category_id = ? WHERE id = ?')
    .bind(body.date, body.category_id, id).run()

  const { results: teIds } = await db.prepare(
    'SELECT id FROM training_exercises WHERE training_id = ?'
  ).bind(id).all()

  for (const te of teIds || []) {
    await db.prepare('DELETE FROM sets WHERE training_exercise_id = ?')
      .bind(te.id).run()
  }
  await db.prepare('DELETE FROM training_exercises WHERE training_id = ?')
    .bind(id).run()

  for (const ex of body.exercises) {
    const { meta } = await db.prepare(
      'INSERT INTO training_exercises (training_id, exercise_id) VALUES (?, ?)'
    ).bind(id, ex.exercise_id).run()
    const teId = meta.last_row_id

    for (const set of ex.sets) {
      await db.prepare(
        'INSERT INTO sets (training_exercise_id, set_number, weight, reps) VALUES (?, ?, ?, ?)'
      ).bind(teId, set.set_number, set.weight, set.reps).run()
    }
  }

  return c.json({ success: true })
})

app.post('/', async (c) => {
  const db = c.env.DB
  const userId = c.get('userId')
  const { date, category_id, exercises } = await c.req.json()

  for (const ex of exercises) {
    const row = await db.prepare(
      'SELECT deleted_at FROM exercises WHERE id = ?'
    ).bind(ex.exercise_id).first()
    if (row?.deleted_at) {
      return c.json({ error: 'Cannot use deleted exercise' }, 400)
    }
  }

  const { meta } = await db.prepare(
    'INSERT INTO trainings (date, user_id, category_id) VALUES (?, ?, ?)'
  ).bind(date, userId, category_id).run()
  const trainingId = meta.last_row_id

  for (const ex of exercises) {
    const { meta: teMeta } = await db.prepare(
      'INSERT INTO training_exercises (training_id, exercise_id) VALUES (?, ?)'
    ).bind(trainingId, ex.exercise_id).run()
    const teId = teMeta.last_row_id

    for (const set of ex.sets) {
      await db.prepare(
        'INSERT INTO sets (training_exercise_id, set_number, weight, reps) VALUES (?, ?, ?, ?)'
      ).bind(teId, set.set_number, set.weight, set.reps).run()
    }
  }

  return c.json({ id: trainingId, success: true })
})

app.delete('/:id', async (c) => {
  const db = c.env.DB
  const userId = c.get('userId')
  const id = c.req.param('id')

  // Verify ownership before deleting
  const existing = await db.prepare('SELECT id FROM trainings WHERE id = ? AND user_id = ?').bind(id, userId).first()
  if (!existing) {
    return c.json({ error: 'Not found' }, 404)
  }

  await db.prepare('DELETE FROM trainings WHERE id = ?').bind(id).run()
  return c.json({ success: true })
})

export default app
