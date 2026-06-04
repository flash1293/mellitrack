import { Hono } from 'hono'
import type { Env, Variables } from '../index'
import type { LastCategoryExerciseGroup, LastCategorySet } from '../../shared/types'
import { validateString, validateNumber } from '../validate'

const app = new Hono<{ Bindings: Env; Variables: Variables }>()

// Helper types for intermediate row shapes
interface TrainingExerciseRow {
  id: number
  exercise_id: number
  exercise_name: string
}

interface SetRow {
  id: number
  set_number: number
  weight: number | null
  reps: number | null
}

interface PreviousSetRow {
  set_number: number
  weight: number | null
  reps: number | null
}

interface LastCategoryRow {
  exercise_id: number
  exercise_name: string
  set_number: number | null
  weight: number | null
  reps: number | null
  te_order_id: number | null
}

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
  `).bind(id, userId).first<{
    id: number
    date: string
    user_id: number
    category_id: number
    category_name: string
  }>()

  if (!training) return c.json({ error: 'Not found' }, 404)

  // Find the previous training in the same category
  const previousTraining = await db.prepare(`
    SELECT id FROM trainings
    WHERE category_id = ? AND user_id = ? AND (date < ? OR (date = ? AND id < ?))
    ORDER BY date DESC, id DESC
    LIMIT 1
  `).bind(training.category_id, userId, training.date, training.date, id).first<{ id: number }>()

  const { results: exercises } = await db.prepare(`
    SELECT te.id, te.exercise_id, e.name as exercise_name
    FROM training_exercises te
    JOIN exercises e ON te.exercise_id = e.id
    WHERE te.training_id = ?
    ORDER BY te.id
  `).bind(id).all<TrainingExerciseRow>()

  // Fetch all sets for this training in a single query (instead of N queries)
  const { results: allSets } = await db.prepare(`
    SELECT s.id, s.set_number, s.weight, s.reps, s.training_exercise_id
    FROM sets s
    JOIN training_exercises te ON s.training_exercise_id = te.id
    WHERE te.training_id = ?
    ORDER BY te.id, s.set_number
  `).bind(id).all<SetRow & { training_exercise_id: number }>()

  // Group sets by training_exercise_id
  const setsByTeId: Record<number, SetRow[]> = {}
  for (const s of allSets || []) {
    const teId = s.training_exercise_id
    if (!setsByTeId[teId]) setsByTeId[teId] = []
    setsByTeId[teId].push({ id: s.id, set_number: s.set_number, weight: s.weight, reps: s.reps })
  }

  // Fetch all previous sets in a single query (if previous training exists)
  const prevSetsByExerciseId: Record<number, PreviousSetRow[]> = {}
  if (previousTraining) {
    const { results: allPrevSets } = await db.prepare(`
      SELECT s.set_number, s.weight, s.reps, te.exercise_id
      FROM sets s
      JOIN training_exercises te ON s.training_exercise_id = te.id
      WHERE te.training_id = ?
      ORDER BY te.exercise_id, s.set_number
    `).bind(previousTraining.id).all<PreviousSetRow & { exercise_id: number }>()

    for (const ps of allPrevSets || []) {
      const exId = ps.exercise_id
      if (!prevSetsByExerciseId[exId]) prevSetsByExerciseId[exId] = []
      prevSetsByExerciseId[exId].push({ set_number: ps.set_number, weight: ps.weight, reps: ps.reps })
    }
  }

  const exercisesWithSets = exercises.map((ex) => ({
    id: ex.id,
    exercise_id: ex.exercise_id,
    exercise_name: ex.exercise_name,
    sets: setsByTeId[ex.id] || [],
    previous_sets: prevSetsByExerciseId[ex.exercise_id] || [],
  }))

  return c.json({ ...training, exercises: exercisesWithSets })
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
  `).bind(exerciseId, userId).first<{ weight: number | null; reps: number | null }>()

  return c.json(result || { weight: null, reps: null })
})

app.get('/last-category/:categoryId', async (c) => {
  const db = c.env.DB
  const userId = c.get('userId')
  const categoryId = Number(c.req.param('categoryId'))

  // Return ALL exercises in the category, each with their last sets from a category training
  // Ordered by: last training's exercise order first, then alphabetically for new exercises
  const { results } = await db.prepare(`
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
      e.sort_order,
      e.name,
      s.set_number
  `).bind(categoryId, userId, categoryId, userId, categoryId, userId).all<LastCategoryRow>()

  const grouped: Record<number, LastCategoryExerciseGroup> = {}
  for (const row of results) {
    if (!grouped[row.exercise_id]) {
      grouped[row.exercise_id] = {
        exercise_id: row.exercise_id,
        exercise_name: row.exercise_name,
        sets: [],
      }
    }
    if (row.set_number !== null) {
      const set: LastCategorySet = {
        set_number: row.set_number,
        weight: row.weight,
        reps: row.reps,
      }
      grouped[row.exercise_id].sets.push(set)
    }
  }

  return c.json(Object.values(grouped))
})

app.put('/:id', async (c) => {
  const db = c.env.DB
  const userId = c.get('userId')
  const id = Number(c.req.param('id'))
  const body = await c.req.json() as { date: string; category_id?: number; exercises: { exercise_id: number; sets: { set_number: number; weight: number; reps: number }[] }[] }

  // Validate
  if (isNaN(id)) return c.json({ error: 'id must be a number' }, 400)
  const dateErr = validateString(body.date, 'date')
  if (dateErr) return c.json({ error: dateErr }, 400)
  if (body.category_id !== undefined) {
    const catErr = validateNumber(body.category_id, 'category_id')
    if (catErr) return c.json({ error: catErr }, 400)
  }
  if (!Array.isArray(body.exercises) || body.exercises.length === 0) {
    return c.json({ error: 'exercises must be a non-empty array' }, 400)
  }
  for (const ex of body.exercises) {
    if (typeof ex.exercise_id !== 'number') {
      return c.json({ error: 'each exercise must have a numeric exercise_id' }, 400)
    }
    if (!Array.isArray(ex.sets)) {
      return c.json({ error: 'each exercise must have a sets array' }, 400)
    }
    for (const s of ex.sets) {
      if (typeof s.set_number !== 'number' || typeof s.weight !== 'number' || typeof s.reps !== 'number') {
        return c.json({ error: 'each set must have set_number, weight, and reps as numbers' }, 400)
      }
    }
  }

  // Verify ownership
  const existing = await db.prepare('SELECT id FROM trainings WHERE id = ? AND user_id = ?').bind(id, userId).first()
  if (!existing) {
    return c.json({ error: 'Not found' }, 404)
  }

  await db.prepare('UPDATE trainings SET date = ?, category_id = ? WHERE id = ?')
    .bind(body.date, body.category_id, id).run()

  const { results: teIds } = await db.prepare(
    'SELECT id FROM training_exercises WHERE training_id = ?'
  ).bind(id).all<{ id: number }>()

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
  const { date, category_id, exercises } = await c.req.json() as { date: string; category_id: number; exercises: { exercise_id: number; sets: { set_number: number; weight: number; reps: number }[] }[] }

  // Validate
  const dateErr = validateString(date, 'date')
  if (dateErr) return c.json({ error: dateErr }, 400)
  const catErr = validateNumber(category_id, 'category_id')
  if (catErr) return c.json({ error: catErr }, 400)
  if (!Array.isArray(exercises) || exercises.length === 0) {
    return c.json({ error: 'exercises must be a non-empty array' }, 400)
  }
  for (const ex of exercises) {
    if (typeof ex.exercise_id !== 'number') {
      return c.json({ error: 'each exercise must have a numeric exercise_id' }, 400)
    }
    if (!Array.isArray(ex.sets)) {
      return c.json({ error: 'each exercise must have a sets array' }, 400)
    }
    for (const s of ex.sets) {
      if (typeof s.set_number !== 'number' || typeof s.weight !== 'number' || typeof s.reps !== 'number') {
        return c.json({ error: 'each set must have set_number, weight, and reps as numbers' }, 400)
      }
    }
  }

  // Single query to validate all exercises (instead of N queries)
  const placeholders = exercises.map(() => '?').join(', ')
  const { results: exerciseRows } = await db.prepare(
    `SELECT id, deleted_at FROM exercises WHERE id IN (${placeholders})`
  ).bind(...exercises.map((ex) => ex.exercise_id)).all<{ id: number; deleted_at: string | null }>()

  const deletedIds = (exerciseRows || []).filter((r) => r.deleted_at).map((r) => r.id)
  if (deletedIds.length > 0) {
    return c.json({ error: 'Cannot use deleted exercise' }, 400)
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
