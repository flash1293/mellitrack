import { Hono } from 'hono'
import { setCookie, deleteCookie, getCookie } from 'hono/cookie'
import type { Env } from '../index'
import { validateString } from '../validate'

const app = new Hono<{ Bindings: Env }>()

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(password)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

app.post('/register', async (c) => {
  const db = c.env.DB
  const { username, password } = await c.req.json()

  const usernameErr = validateString(username, 'username')
  if (usernameErr) return c.json({ error: usernameErr }, 400)
  const passwordErr = validateString(password, 'password')
  if (passwordErr) return c.json({ error: passwordErr }, 400)

  if (password.length < 4) {
    return c.json({ error: 'Password must be at least 4 characters' }, 400)
  }

  const existing = await db.prepare('SELECT id FROM users WHERE username = ?').bind(username).first()
  if (existing) {
    return c.json({ error: 'Username already taken' }, 409)
  }

  const passwordHash = await hashPassword(password)
  const { meta } = await db.prepare(
    'INSERT INTO users (username, password_hash) VALUES (?, ?)'
  ).bind(username, passwordHash).run()

  const userId = meta.last_row_id

  // Seed default categories for new user
  const defaultCategories = ['Oberkörper', 'Unterkörper', 'Ganzkörper']
  for (const catName of defaultCategories) {
    await db.prepare(
      'INSERT OR IGNORE INTO exercise_categories (name, user_id) VALUES (?, ?)'
    ).bind(catName, userId).run()
  }

  setCookie(c, 'session', String(userId), {
    httpOnly: true,
    secure: false,
    sameSite: 'Lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  })

  return c.json({ success: true, userId })
})

app.post('/login', async (c) => {
  const db = c.env.DB
  const { username, password } = await c.req.json()

  const usernameErr = validateString(username, 'username')
  if (usernameErr) return c.json({ error: usernameErr }, 400)
  const passwordErr = validateString(password, 'password')
  if (passwordErr) return c.json({ error: passwordErr }, 400)

  const passwordHash = await hashPassword(password)
  const user = await db.prepare(
    'SELECT id FROM users WHERE username = ? AND password_hash = ?'
  ).bind(username, passwordHash).first()

  if (!user) {
    return c.json({ error: 'Invalid username or password' }, 401)
  }

  setCookie(c, 'session', String(user.id), {
    httpOnly: true,
    secure: false,
    sameSite: 'Lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  })

  return c.json({ success: true, userId: user.id })
})

app.post('/logout', async (c) => {
  deleteCookie(c, 'session', { path: '/' })
  return c.json({ success: true })
})

app.get('/check', async (c) => {
  const session = getCookie(c, 'session')
  if (!session) {
    return c.json({ authenticated: false })
  }

  const userId = parseInt(session, 10)
  if (isNaN(userId)) {
    return c.json({ authenticated: false })
  }

  const db = c.env.DB
  const user = await db.prepare('SELECT username FROM users WHERE id = ?').bind(userId).first()

  if (!user) {
    return c.json({ authenticated: false })
  }

  return c.json({ authenticated: true, username: user.username })
})

export default app
