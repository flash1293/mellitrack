import { Hono } from 'hono'
import type { Env, Variables } from '../index'
import type { FoodEntryWithName, DailySummary } from '../../shared/types'
import { validatePositiveNumber } from '../validate'

const app = new Hono<{ Bindings: Env; Variables: Variables }>()

// GET /api/food-entries?date=YYYY-MM-DD
app.get('/', async (c) => {
  const db = c.env.DB
  const userId = c.get('userId')
  const date = c.req.query('date')

  if (!date) return c.json({ error: 'date query parameter required' }, 400)

  const { results } = await db.prepare(`
    SELECT fe.*, f.name as food_name, f.calories_per_100g,
      ROUND(fe.amount_grams * f.calories_per_100g / 100.0, 1) as calories
    FROM food_entries fe
    JOIN foods f ON fe.food_id = f.id
    WHERE fe.user_id = ? AND DATE(fe.consumed_at) = ?
    ORDER BY fe.consumed_at
  `).bind(userId, date).all()

  return c.json(results as unknown as FoodEntryWithName[])
})

// GET /api/food-entries/summary?date=YYYY-MM-DD
app.get('/summary', async (c) => {
  const db = c.env.DB
  const userId = c.get('userId')
  const date = c.req.query('date')

  if (!date) return c.json({ error: 'date query parameter required' }, 400)

  const { results } = await db.prepare(`
    SELECT fe.*, f.name as food_name, f.calories_per_100g,
      ROUND(fe.amount_grams * f.calories_per_100g / 100.0, 1) as calories
    FROM food_entries fe
    JOIN foods f ON fe.food_id = f.id
    WHERE fe.user_id = ? AND DATE(fe.consumed_at) = ?
    ORDER BY fe.consumed_at
  `).bind(userId, date).all()

  const entries = results as unknown as FoodEntryWithName[]
  const total_calories = Math.round(entries.reduce((sum, e) => sum + e.calories, 0))

  const summary: DailySummary = { date, entries, total_calories }
  return c.json(summary)
})

app.post('/', async (c) => {
  const db = c.env.DB
  const userId = c.get('userId')
  const { food_id, amount_grams, consumed_at } = await c.req.json()

  if (!food_id || typeof food_id !== 'number') return c.json({ error: 'food_id required' }, 400)
  if (!consumed_at || typeof consumed_at !== 'string') return c.json({ error: 'consumed_at required' }, 400)

  const amountErr = validatePositiveNumber(amount_grams, 'amount_grams')
  if (amountErr) return c.json({ error: amountErr }, 400)

  // Verify food belongs to user
  const food = await db.prepare(
    'SELECT id FROM foods WHERE id = ? AND user_id = ?'
  ).bind(food_id, userId).first()
  if (!food) return c.json({ error: 'Food not found' }, 404)

  const { meta } = await db.prepare(
    'INSERT INTO food_entries (user_id, food_id, amount_grams, consumed_at) VALUES (?, ?, ?, ?)'
  ).bind(userId, food_id, amount_grams, consumed_at).run()
  return c.json({ id: meta.last_row_id, success: true })
})

app.put('/:id', async (c) => {
  const db = c.env.DB
  const userId = c.get('userId')
  const id = c.req.param('id')
  const { food_id, amount_grams, consumed_at } = await c.req.json()

  const existing = await db.prepare(
    'SELECT id FROM food_entries WHERE id = ? AND user_id = ?'
  ).bind(id, userId).first()
  if (!existing) return c.json({ error: 'Not found' }, 404)

  if (!food_id || typeof food_id !== 'number') return c.json({ error: 'food_id required' }, 400)
  if (!consumed_at || typeof consumed_at !== 'string') return c.json({ error: 'consumed_at required' }, 400)

  const amountErr = validatePositiveNumber(amount_grams, 'amount_grams')
  if (amountErr) return c.json({ error: amountErr }, 400)

  const food = await db.prepare(
    'SELECT id FROM foods WHERE id = ? AND user_id = ?'
  ).bind(food_id, userId).first()
  if (!food) return c.json({ error: 'Food not found' }, 404)

  await db.prepare(
    'UPDATE food_entries SET food_id = ?, amount_grams = ?, consumed_at = ? WHERE id = ?'
  ).bind(food_id, amount_grams, consumed_at, id).run()
  return c.json({ success: true })
})

app.delete('/:id', async (c) => {
  const db = c.env.DB
  const userId = c.get('userId')
  const id = c.req.param('id')

  const existing = await db.prepare(
    'SELECT id FROM food_entries WHERE id = ? AND user_id = ?'
  ).bind(id, userId).first()
  if (!existing) return c.json({ error: 'Not found' }, 404)

  await db.prepare('DELETE FROM food_entries WHERE id = ?').bind(id).run()
  return c.json({ success: true })
})

export default app
