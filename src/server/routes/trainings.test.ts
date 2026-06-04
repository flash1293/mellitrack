import { describe, it, expect, beforeEach } from 'vitest'
import { Hono } from 'hono'
import type { MiddlewareHandler } from 'hono'
import trainings from './trainings'
import { resetDb, createTestEnv } from '../test-utils'

function createTestApp() {
  const app = new Hono<{ Bindings: ReturnType<typeof createTestEnv>; Variables: { userId: number } }>()

  const mockAuth: MiddlewareHandler<{ Bindings: ReturnType<typeof createTestEnv>; Variables: { userId: number } }> = async (c, next) => {
    c.set('userId', 1)
    await next()
  }

  app.use('/*', mockAuth)
  app.route('/', trainings)
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

function seedBasicData(env: ReturnType<typeof createTestEnv>) {
  const db = env.DB
  // Categories
  db.prepare('INSERT INTO exercise_categories (name, user_id, sort_order) VALUES (?, ?, ?)').bind('Upper Body', 1, 0).run()
  db.prepare('INSERT INTO exercise_categories (name, user_id, sort_order) VALUES (?, ?, ?)').bind('Lower Body', 1, 1).run()
  // Exercises
  db.prepare('INSERT INTO exercises (name, user_id, sort_order) VALUES (?, ?, ?)').bind('Bench Press', 1, 0).run()
  db.prepare('INSERT INTO exercises (name, user_id, sort_order) VALUES (?, ?, ?)').bind('Squat', 1, 1).run()
  // Exercise-category mappings
  db.prepare('INSERT INTO exercise_category_mappings (exercise_id, category_id) VALUES (?, ?)').bind(1, 1).run()
  db.prepare('INSERT INTO exercise_category_mappings (exercise_id, category_id) VALUES (?, ?)').bind(2, 2).run()
}

describe('Trainings Routes', () => {
  let app: ReturnType<typeof createTestApp>

  beforeEach(() => {
    resetDb()
    app = createTestApp()
  })

  describe('GET /', () => {
    it('returns empty list when no trainings exist', async () => {
      const env = createTestEnv()
      const res = await app.request(createRequest('GET', '/'), {}, env)
      expect(res.status).toBe(200)
      const data: any = await res.json()
      expect(data).toEqual([])
    })
  })

  describe('POST /', () => {
    it('creates a new training', async () => {
      const env = createTestEnv()
      seedBasicData(env)

      const res = await app.request(
        createRequest('POST', '/', {
          date: '2024-05-15',
          category_id: 1,
          exercises: [
            {
              exercise_id: 1,
              sets: [
                { set_number: 1, weight: 60, reps: 10 },
                { set_number: 2, weight: 70, reps: 8 },
              ],
            },
          ],
        }),
        {},
        env
      )
      expect(res.status).toBe(200)
      const data: any = await res.json()
      expect(data.success).toBe(true)
      expect(data.id).toBeDefined()
    })

    it('returns 400 for missing date', async () => {
      const env = createTestEnv()
      seedBasicData(env)

      const res = await app.request(
        createRequest('POST', '/', {
          category_id: 1,
          exercises: [{ exercise_id: 1, sets: [{ set_number: 1, weight: 60, reps: 10 }] }],
        }),
        {},
        env
      )
      expect(res.status).toBe(400)
    })

    it('returns 400 for empty exercises array', async () => {
      const env = createTestEnv()
      seedBasicData(env)

      const res = await app.request(
        createRequest('POST', '/', {
          date: '2024-05-15',
          category_id: 1,
          exercises: [],
        }),
        {},
        env
      )
      expect(res.status).toBe(400)
    })

    it('returns 400 for non-numeric exercise_id', async () => {
      const env = createTestEnv()
      seedBasicData(env)

      const res = await app.request(
        createRequest('POST', '/', {
          date: '2024-05-15',
          category_id: 1,
          exercises: [{ exercise_id: 'abc', sets: [{ set_number: 1, weight: 60, reps: 10 }] }],
        }),
        {},
        env
      )
      expect(res.status).toBe(400)
    })

    it('returns 400 for invalid category_id', async () => {
      const env = createTestEnv()
      seedBasicData(env)

      const res = await app.request(
        createRequest('POST', '/', {
          date: '2024-05-15',
          category_id: 'not-a-number',
          exercises: [{ exercise_id: 1, sets: [{ set_number: 1, weight: 60, reps: 10 }] }],
        }),
        {},
        env
      )
      expect(res.status).toBe(400)
    })
  })

  describe('GET /:id', () => {
    it('returns 404 for non-existent training', async () => {
      const env = createTestEnv()
      const res = await app.request(createRequest('GET', '/999'), {}, env)
      expect(res.status).toBe(404)
    })

    it('returns a training with exercises and sets', async () => {
      const env = createTestEnv()
      seedBasicData(env)

      // Create training first
      const createRes = await app.request(
        createRequest('POST', '/', {
          date: '2024-05-15',
          category_id: 1,
          exercises: [
            {
              exercise_id: 1,
              sets: [
                { set_number: 1, weight: 60, reps: 10 },
                { set_number: 2, weight: 70, reps: 8 },
              ],
            },
          ],
        }),
        {},
        env
      )
      const { id }: any = await createRes.json()

      // Get training
      const res = await app.request(createRequest('GET', `/${id}`), {}, env)
      expect(res.status).toBe(200)
      const data: any = await res.json()
      expect(data.id).toBe(id)
      expect(data.date).toBe('2024-05-15')
      expect(data.exercises).toHaveLength(1)
      expect(data.exercises[0].exercise_name).toBe('Bench Press')
      expect(data.exercises[0].sets).toHaveLength(2)
    })
  })

  describe('GET /last-set/:exerciseId', () => {
    it('returns null values when no sets exist', async () => {
      const env = createTestEnv()
      const res = await app.request(createRequest('GET', '/last-set/1'), {}, env)
      expect(res.status).toBe(200)
      const data: any = await res.json()
      expect(data.weight).toBeNull()
      expect(data.reps).toBeNull()
    })

    it('returns the last set for an exercise', async () => {
      const env = createTestEnv()
      seedBasicData(env)

      // Create a training with sets
      await app.request(
        createRequest('POST', '/', {
          date: '2024-05-15',
          category_id: 1,
          exercises: [
            {
              exercise_id: 1,
              sets: [
                { set_number: 1, weight: 60, reps: 10 },
                { set_number: 2, weight: 70, reps: 8 },
              ],
            },
          ],
        }),
        {},
        env
      )

      const res = await app.request(createRequest('GET', '/last-set/1'), {}, env)
      expect(res.status).toBe(200)
      const data: any = await res.json()
      expect(data.weight).toBe(70)
      expect(data.reps).toBe(8)
    })
  })

  describe('PUT /:id', () => {
    it('updates an existing training', async () => {
      const env = createTestEnv()
      seedBasicData(env)

      // Create training
      const createRes = await app.request(
        createRequest('POST', '/', {
          date: '2024-05-15',
          category_id: 1,
          exercises: [{ exercise_id: 1, sets: [{ set_number: 1, weight: 60, reps: 10 }] }],
        }),
        {},
        env
      )
      const { id }: any = await createRes.json()

      // Update training
      const res = await app.request(
        createRequest('PUT', `/${id}`, {
          date: '2024-05-16',
          exercises: [{ exercise_id: 1, sets: [{ set_number: 1, weight: 65, reps: 8 }] }],
        }),
        {},
        env
      )
      expect(res.status).toBe(200)
      const data: any = await res.json()
      expect(data.success).toBe(true)
    })

    it('returns 404 for non-existent training', async () => {
      const env = createTestEnv()
      const res = await app.request(
        createRequest('PUT', '/999', {
          date: '2024-05-16',
          exercises: [{ exercise_id: 1, sets: [{ set_number: 1, weight: 65, reps: 8 }] }],
        }),
        {},
        env
      )
      expect(res.status).toBe(404)
    })
  })

  describe('DELETE /:id', () => {
    it('deletes a training', async () => {
      const env = createTestEnv()
      seedBasicData(env)

      // Create training
      const createRes = await app.request(
        createRequest('POST', '/', {
          date: '2024-05-15',
          category_id: 1,
          exercises: [{ exercise_id: 1, sets: [{ set_number: 1, weight: 60, reps: 10 }] }],
        }),
        {},
        env
      )
      const { id }: any = await createRes.json()

      // Delete
      const res = await app.request(createRequest('DELETE', `/${id}`), {}, env)
      expect(res.status).toBe(200)
      const data: any = await res.json()
      expect(data.success).toBe(true)
    })

    it('returns 404 for non-existent training', async () => {
      const env = createTestEnv()
      const res = await app.request(createRequest('DELETE', '/999'), {}, env)
      expect(res.status).toBe(404)
    })
  })

  describe('GET /last-category/:categoryId', () => {
    it('returns empty array when no trainings exist', async () => {
      const env = createTestEnv()
      seedBasicData(env)

      const res = await app.request(createRequest('GET', '/last-category/1'), {}, env)
      expect(res.status).toBe(200)
      const data: any = await res.json()
      expect(data).toEqual([])
    })
  })
})
