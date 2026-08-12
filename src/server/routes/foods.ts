import { Hono } from 'hono'
import type { Env, Variables } from '../index'
import type { Food } from '../../shared/types'
import { validateString, validatePositiveNumber, validateOptionalPositiveNumber } from '../validate'

const app = new Hono<{ Bindings: Env; Variables: Variables }>()

app.get('/', async (c) => {
  const db = c.env.DB
  const userId = c.get('userId')
  const { results } = await db.prepare(
    'SELECT * FROM foods WHERE user_id = ? ORDER BY name'
  ).bind(userId).all()
  return c.json(results as unknown as Food[])
})

app.post('/', async (c) => {
  const db = c.env.DB
  const userId = c.get('userId')
  const { name, calories_per_100g, protein_per_100g } = await c.req.json()

  const nameErr = validateString(name, 'name')
  if (nameErr) return c.json({ error: nameErr }, 400)
  const calErr = validatePositiveNumber(calories_per_100g, 'calories_per_100g')
  if (calErr) return c.json({ error: calErr }, 400)
  const protErr = validateOptionalPositiveNumber(protein_per_100g, 'protein_per_100g')
  if (protErr) return c.json({ error: protErr }, 400)

  const protein = protein_per_100g === undefined || protein_per_100g === null ? null : protein_per_100g

  try {
    const { meta } = await db.prepare(
      'INSERT INTO foods (user_id, name, calories_per_100g, protein_per_100g) VALUES (?, ?, ?, ?)'
    ).bind(userId, name, calories_per_100g, protein).run()
    return c.json({ id: meta.last_row_id, success: true })
  } catch (e: unknown) {
    const msg = String(e)
    if (msg.includes('UNIQUE')) {
      return c.json({ error: 'Lebensmittel existiert bereits' }, 409)
    }
    throw e
  }
})

app.put('/:id', async (c) => {
  const db = c.env.DB
  const userId = c.get('userId')
  const id = c.req.param('id')
  const { name, calories_per_100g, protein_per_100g } = await c.req.json()

  const nameErr = validateString(name, 'name')
  if (nameErr) return c.json({ error: nameErr }, 400)
  const calErr = validatePositiveNumber(calories_per_100g, 'calories_per_100g')
  if (calErr) return c.json({ error: calErr }, 400)
  const protErr = validateOptionalPositiveNumber(protein_per_100g, 'protein_per_100g')
  if (protErr) return c.json({ error: protErr }, 400)

  const protein = protein_per_100g === undefined || protein_per_100g === null ? null : protein_per_100g

  const existing = await db.prepare(
    'SELECT id FROM foods WHERE id = ? AND user_id = ?'
  ).bind(id, userId).first()
  if (!existing) return c.json({ error: 'Not found' }, 404)

  await db.prepare(
    'UPDATE foods SET name = ?, calories_per_100g = ?, protein_per_100g = ? WHERE id = ?'
  ).bind(name, calories_per_100g, protein, id).run()
  return c.json({ success: true })
})

app.delete('/:id', async (c) => {
  const db = c.env.DB
  const userId = c.get('userId')
  const id = c.req.param('id')

  const existing = await db.prepare(
    'SELECT id FROM foods WHERE id = ? AND user_id = ?'
  ).bind(id, userId).first()
  if (!existing) return c.json({ error: 'Not found' }, 404)

  await db.prepare('DELETE FROM foods WHERE id = ?').bind(id).run()
  return c.json({ success: true })
})

export default app
