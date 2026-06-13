import { describe, it, expect, beforeEach } from 'vitest'
import { Hono } from 'hono'
import type { MiddlewareHandler } from 'hono'
import exercises from './exercises'
import { resetDb, createTestEnv } from '../test-utils'

// Build a test app with the exercises routes, mocking auth middleware
function createTestApp() {
  const app = new Hono<{ Bindings: ReturnType<typeof createTestEnv>; Variables: { userId: number } }>()

  // Mock auth middleware — sets userId to 1
  const mockAuth: MiddlewareHandler<{ Bindings: ReturnType<typeof createTestEnv>; Variables: { userId: number } }> = async (c, next) => {
    c.set('userId', 1)
    await next()
  }

  app.use('/*', mockAuth)
  app.route('/', exercises)
  return app
}

function createRequest(method: string, path: string, body?: unknown): Request {
  const opts: RequestInit = {
    method,
    headers: { 'Content-Type': 'application/json' },
  }
  if (body) {
    opts.body = JSON.stringify(body)
  }
  return new Request(`http://localhost${path}`, opts)
}

// Helper to seed data
function seedCategories(env: ReturnType<typeof createTestEnv>) {
  const db = env.DB
  // Insert categories directly
  db.prepare('INSERT INTO exercise_categories (name, user_id, sort_order) VALUES (?, ?, ?)').bind('Upper Body', 1, 0).run()
  db.prepare('INSERT INTO exercise_categories (name, user_id, sort_order) VALUES (?, ?, ?)').bind('Lower Body', 1, 1).run()
}

describe('Exercises Routes', () => {
  let app: ReturnType<typeof createTestApp>

  beforeEach(() => {
    resetDb()
    app = createTestApp()
  })

  describe('GET /', () => {
    it('returns empty list when no exercises exist', async () => {
      const env = createTestEnv()
      const res = await app.request(createRequest('GET', '/'), {}, env)
      expect(res.status).toBe(200)
      const data: any = await res.json()
      expect(data).toEqual([])
    })

    it('returns exercises with categories', async () => {
      const env = createTestEnv()
      seedCategories(env)

      // Create an exercise
      const createRes = await app.request(
        createRequest('POST', '/', { name: 'Bench Press', category_ids: [1] }),
        {},
        env
      )
      expect(createRes.status).toBe(200)

      // Get exercises
      const res = await app.request(createRequest('GET', '/'), {}, env)
      expect(res.status).toBe(200)
      const data: any = await res.json()
      expect(data).toHaveLength(1)
      expect(data[0].name).toBe('Bench Press')
      expect(data[0].categories).toHaveLength(1)
      expect(data[0].categories[0].name).toBe('Upper Body')
    })
  })

  describe('POST /', () => {
    it('creates a new exercise', async () => {
      const env = createTestEnv()
      seedCategories(env)

      const res = await app.request(
        createRequest('POST', '/', { name: 'Pull Up', category_ids: [1] }),
        {},
        env
      )
      expect(res.status).toBe(200)
      const data: any = await res.json()
      expect(data.success).toBe(true)
      expect(data.id).toBeDefined()
    })

    it('returns 400 for empty name', async () => {
      const env = createTestEnv()
      const res = await app.request(
        createRequest('POST', '/', { name: '', category_ids: [1] }),
        {},
        env
      )
      expect(res.status).toBe(400)
    })

    it('returns 400 for empty category_ids', async () => {
      const env = createTestEnv()
      const res = await app.request(
        createRequest('POST', '/', { name: 'Test', category_ids: [] }),
        {},
        env
      )
      expect(res.status).toBe(400)
    })

    it('returns 400 for missing name', async () => {
      const env = createTestEnv()
      const res = await app.request(
        createRequest('POST', '/', { category_ids: [1] }),
        {},
        env
      )
      expect(res.status).toBe(400)
    })
  })

  describe('PUT /reorder', () => {
    it('reorders exercises', async () => {
      const env = createTestEnv()
      seedCategories(env)

      // Create two exercises
      await app.request(
        createRequest('POST', '/', { name: 'Exercise A', category_ids: [1] }),
        {},
        env
      )
      await app.request(
        createRequest('POST', '/', { name: 'Exercise B', category_ids: [1] }),
        {},
        env
      )

      const res = await app.request(
        createRequest('PUT', '/reorder', { ids: [2, 1], category_id: 1 }),
        {},
        env
      )
      expect(res.status).toBe(200)
      const data: any = await res.json()
      expect(data.success).toBe(true)
    })

    it('returns 400 for empty ids array', async () => {
      const env = createTestEnv()
      const res = await app.request(
        createRequest('PUT', '/reorder', { ids: [], category_id: 1 }),
        {},
        env
      )
      expect(res.status).toBe(400)
    })

    it('returns 400 for missing category_id', async () => {
      const env = createTestEnv()
      const res = await app.request(
        createRequest('PUT', '/reorder', { ids: [1, 2] }),
        {},
        env
      )
      expect(res.status).toBe(400)
    })

    it('returns 404 for non-existent category_id', async () => {
      const env = createTestEnv()
      seedCategories(env)
      // Create an exercise first
      await app.request(
        createRequest('POST', '/', { name: 'Test', category_ids: [1] }),
        {},
        env
      )
      const res = await app.request(
        createRequest('PUT', '/reorder', { ids: [1], category_id: 999 }),
        {},
        env
      )
      expect(res.status).toBe(404)
    })
  })

  describe('PUT /:id', () => {
    it('updates an exercise name', async () => {
      const env = createTestEnv()
      seedCategories(env)

      await app.request(
        createRequest('POST', '/', { name: 'Old Name', category_ids: [1] }),
        {},
        env
      )

      const res = await app.request(
        createRequest('PUT', '/1', { name: 'New Name' }),
        {},
        env
      )
      expect(res.status).toBe(200)
      const data: any = await res.json()
      expect(data.success).toBe(true)
    })

    it('returns 404 for non-existent exercise', async () => {
      const env = createTestEnv()
      const res = await app.request(
        createRequest('PUT', '/999', { name: 'Nope' }),
        {},
        env
      )
      expect(res.status).toBe(404)
    })

    it('returns 400 for empty name on update', async () => {
      const env = createTestEnv()
      seedCategories(env)
      await app.request(
        createRequest('POST', '/', { name: 'Test', category_ids: [1] }),
        {},
        env
      )

      const res = await app.request(
        createRequest('PUT', '/1', { name: '' }),
        {},
        env
      )
      expect(res.status).toBe(400)
    })
  })

  describe('DELETE /:id', () => {
    it('hard deletes an exercise with no training references', async () => {
      const env = createTestEnv()
      seedCategories(env)

      await app.request(
        createRequest('POST', '/', { name: 'Delete Me', category_ids: [1] }),
        {},
        env
      )

      const res = await app.request(
        createRequest('DELETE', '/1'),
        {},
        env
      )
      expect(res.status).toBe(200)
      const data: any = await res.json()
      expect(data.deleted).toBe('hard')
    })

    it('returns 404 for non-existent exercise', async () => {
      const env = createTestEnv()
      const res = await app.request(
        createRequest('DELETE', '/999'),
        {},
        env
      )
      expect(res.status).toBe(404)
    })
  })

  describe('GET /categories', () => {
    it('returns empty list when no categories exist', async () => {
      const env = createTestEnv()
      const res = await app.request(createRequest('GET', '/categories'), {}, env)
      expect(res.status).toBe(200)
      const data: any = await res.json()
      expect(data).toEqual([])
    })

    it('returns categories for the user', async () => {
      const env = createTestEnv()
      seedCategories(env)

      const res = await app.request(createRequest('GET', '/categories'), {}, env)
      expect(res.status).toBe(200)
      const data: any = await res.json()
      expect(data).toHaveLength(2)
      expect(data[0].name).toBe('Upper Body')
    })
  })

  describe('POST /categories', () => {
    it('creates a new category', async () => {
      const env = createTestEnv()
      const res = await app.request(
        createRequest('POST', '/categories', { name: 'Cardio' }),
        {},
        env
      )
      expect(res.status).toBe(200)
    })

    it('returns 400 for empty category name', async () => {
      const env = createTestEnv()
      const res = await app.request(
        createRequest('POST', '/categories', { name: '' }),
        {},
        env
      )
      expect(res.status).toBe(400)
    })
  })

  describe('GET /by-category/:categoryId', () => {
    it('returns exercises for a category', async () => {
      const env = createTestEnv()
      seedCategories(env)

      await app.request(
        createRequest('POST', '/', { name: 'Bench Press', category_ids: [1] }),
        {},
        env
      )

      const res = await app.request(createRequest('GET', '/by-category/1'), {}, env)
      expect(res.status).toBe(200)
      const data: any = await res.json()
      expect(data).toHaveLength(1)
      expect(data[0].name).toBe('Bench Press')
    })

    it('returns empty list when category has no exercises', async () => {
      const env = createTestEnv()
      seedCategories(env)

      const res = await app.request(createRequest('GET', '/by-category/1'), {}, env)
      expect(res.status).toBe(200)
      const data: any = await res.json()
      expect(data).toEqual([])
    })
  })
})
