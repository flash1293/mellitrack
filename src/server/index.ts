import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { getCookie } from 'hono/cookie'
import type { MiddlewareHandler } from 'hono'
import auth from './routes/auth'
import exercises from './routes/exercises'
import trainings from './routes/trainings'
import progress from './routes/progress'
import { STATIC_ASSETS } from './static-manifest'

export type Env = {
  DB: D1Database
}

export type Variables = {
  userId: number
}

const app = new Hono<{ Bindings: Env; Variables: Variables }>()

app.use('/api/*', cors({
  origin: '*',
  credentials: true,
}))

// Auth middleware for protected routes
const authMiddleware: MiddlewareHandler<{ Bindings: Env; Variables: Variables }> = async (c, next) => {
  const session = getCookie(c, 'session')
  if (!session) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  const userId = parseInt(session, 10)
  if (isNaN(userId)) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  // Verify user exists
  const db = c.env.DB
  const user = await db.prepare('SELECT id FROM users WHERE id = ?').bind(userId).first()
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  c.set('userId', userId)
  await next()
}

app.use('/api/exercises/*', authMiddleware)
app.use('/api/trainings/*', authMiddleware)
app.use('/api/progress/*', authMiddleware)

app.route('/api/auth', auth)
app.route('/api/exercises', exercises)
app.route('/api/trainings', trainings)
app.route('/api/progress', progress)

// Serve static files for non-API routes
app.get('*', (c) => {
  const url = new URL(c.req.url)
  let path = url.pathname.slice(1) || 'index.html'

  // For client-side routing, fall back to index.html
  if (!STATIC_ASSETS[path]) {
    path = 'index.html'
  }

  const asset = STATIC_ASSETS[path]
  if (!asset) {
    return c.text('Not Found', 404)
  }

  return new Response(asset.content, {
    headers: { 'content-type': asset.type },
  })
})

export default app
