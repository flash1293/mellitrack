import { Hono } from 'hono'
import type { Env, Variables } from '../index'
import type { FoodEntryWithName, DailySummary } from '../../shared/types'
import { validateString, validatePositiveNumber } from '../validate'

const app = new Hono<{ Bindings: Env; Variables: Variables }>()

const ENTRY_SELECT = `
  SELECT fe.*,
    COALESCE(fe.custom_name, f.name) as name,
    COALESCE(fe.custom_calories_per_100g, f.calories_per_100g) as calories_per_100g,
    ROUND(fe.amount_grams * COALESCE(fe.custom_calories_per_100g, f.calories_per_100g) / 100.0, 1) as calories
  FROM food_entries fe
  LEFT JOIN foods f ON fe.food_id = f.id
`

// GET /api/food-entries?date=YYYY-MM-DD
app.get('/', async (c) => {
  const db = c.env.DB
  const userId = c.get('userId')
  const date = c.req.query('date')

  if (!date) return c.json({ error: 'date query parameter required' }, 400)

  const { results } = await db.prepare(`
    ${ENTRY_SELECT}
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
    ${ENTRY_SELECT}
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
  const { food_id, custom_name, custom_calories_per_100g, amount_grams, consumed_at } = await c.req.json()

  if (!consumed_at || typeof consumed_at !== 'string') return c.json({ error: 'consumed_at required' }, 400)

  const amountErr = validatePositiveNumber(amount_grams, 'amount_grams')
  if (amountErr) return c.json({ error: amountErr }, 400)

  // Two modes: select an existing food, or enter a free-form entry
  const hasFood = food_id !== undefined && food_id !== null
  const hasCustom = custom_name !== undefined && custom_calories_per_100g !== undefined

  let finalFoodId: number | null = null
  let finalCustomName: string | null = null
  let finalCustomCalories: number | null = null

  if (hasFood) {
    const food = await db.prepare(
      'SELECT id FROM foods WHERE id = ? AND user_id = ?'
    ).bind(food_id, userId).first()
    if (!food) return c.json({ error: 'Food not found' }, 404)
    finalFoodId = food_id as number
  } else if (hasCustom) {
    const nameErr = validateString(custom_name, 'custom_name')
    if (nameErr) return c.json({ error: nameErr }, 400)
    const calErr = validatePositiveNumber(custom_calories_per_100g, 'custom_calories_per_100g')
    if (calErr) return c.json({ error: calErr }, 400)
    finalCustomName = custom_name as string
    finalCustomCalories = custom_calories_per_100g as number
  } else {
    return c.json({ error: 'Either food_id or custom_name + custom_calories_per_100g required' }, 400)
  }

  const { meta } = await db.prepare(
    'INSERT INTO food_entries (user_id, food_id, custom_name, custom_calories_per_100g, amount_grams, consumed_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(userId, finalFoodId, finalCustomName, finalCustomCalories, amount_grams, consumed_at).run()
  return c.json({ id: meta.last_row_id, success: true })
})

app.put('/:id', async (c) => {
  const db = c.env.DB
  const userId = c.get('userId')
  const id = c.req.param('id')
  const { food_id, custom_name, custom_calories_per_100g, amount_grams, consumed_at } = await c.req.json()

  const existing = await db.prepare(
    'SELECT id FROM food_entries WHERE id = ? AND user_id = ?'
  ).bind(id, userId).first()
  if (!existing) return c.json({ error: 'Not found' }, 404)

  if (!consumed_at || typeof consumed_at !== 'string') return c.json({ error: 'consumed_at required' }, 400)

  const amountErr = validatePositiveNumber(amount_grams, 'amount_grams')
  if (amountErr) return c.json({ error: amountErr }, 400)

  const hasFood = food_id !== undefined && food_id !== null
  const hasCustom = custom_name !== undefined && custom_calories_per_100g !== undefined

  let finalFoodId: number | null = null
  let finalCustomName: string | null = null
  let finalCustomCalories: number | null = null

  if (hasFood) {
    const food = await db.prepare(
      'SELECT id FROM foods WHERE id = ? AND user_id = ?'
    ).bind(food_id, userId).first()
    if (!food) return c.json({ error: 'Food not found' }, 404)
    finalFoodId = food_id as number
  } else if (hasCustom) {
    const nameErr = validateString(custom_name, 'custom_name')
    if (nameErr) return c.json({ error: nameErr }, 400)
    const calErr = validatePositiveNumber(custom_calories_per_100g, 'custom_calories_per_100g')
    if (calErr) return c.json({ error: calErr }, 400)
    finalCustomName = custom_name as string
    finalCustomCalories = custom_calories_per_100g as number
  } else {
    return c.json({ error: 'Either food_id or custom_name + custom_calories_per_100g required' }, 400)
  }

  await db.prepare(
    'UPDATE food_entries SET food_id = ?, custom_name = ?, custom_calories_per_100g = ?, amount_grams = ?, consumed_at = ? WHERE id = ?'
  ).bind(finalFoodId, finalCustomName, finalCustomCalories, amount_grams, consumed_at, id).run()
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
