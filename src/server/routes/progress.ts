import { Hono } from 'hono'
import type { Env, Variables } from '../index'

const app = new Hono<{ Bindings: Env; Variables: Variables }>()

app.get('/', async (c) => {
  const db = c.env.DB
  const userId = c.get('userId')
  const { results } = await db.prepare(`
    SELECT
      c.id as category_id,
      c.name as category_name,
      e.id as exercise_id,
      e.name as exercise_name,
      t.date,
      MAX(s.weight) as max_weight,
      SUM(s.reps) as total_reps
    FROM exercise_categories c
    JOIN exercise_category_mappings m ON c.id = m.category_id
    JOIN exercises e ON m.exercise_id = e.id
    JOIN training_exercises te ON e.id = te.exercise_id
    JOIN trainings t ON te.training_id = t.id
    JOIN sets s ON te.id = s.training_exercise_id
    WHERE t.user_id = ?
    GROUP BY c.id, e.id, t.date
    ORDER BY c.name, e.name, t.date
  `).bind(userId).all()
  return c.json(results)
})

app.get('/:exerciseId', async (c) => {
  const db = c.env.DB
  const userId = c.get('userId')
  const exerciseId = c.req.param('exerciseId')

  const { results } = await db.prepare(`
    SELECT 
      t.date,
      t.category_id,
      c.name as category_name,
      te.exercise_id,
      e.name as exercise_name,
      AVG(s.weight) as avg_weight,
      MAX(s.weight) as max_weight,
      SUM(s.reps) as total_reps,
      COUNT(s.id) as set_count
    FROM trainings t
    JOIN training_exercises te ON t.id = te.training_id
    JOIN exercises e ON te.exercise_id = e.id
    JOIN sets s ON te.id = s.training_exercise_id
    LEFT JOIN exercise_categories c ON t.category_id = c.id
    WHERE te.exercise_id = ? AND t.user_id = ?
    GROUP BY t.id, t.date, t.category_id, c.name, te.exercise_id, e.name
    ORDER BY t.date ASC
  `).bind(exerciseId, userId).all()

  return c.json(results)
})

export default app
