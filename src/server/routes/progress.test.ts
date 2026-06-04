import { describe, it, expect, beforeEach } from 'vitest'
import { Hono } from 'hono'
import type { MiddlewareHandler } from 'hono'
import progress from './progress'
import { resetDb, createTestEnv } from '../test-utils'

function createTestApp() {
  const app = new Hono<{ Bindings: ReturnType<typeof createTestEnv>; Variables: { userId: number } }>()

  const mockAuth: MiddlewareHandler<{ Bindings: ReturnType<typeof createTestEnv>; Variables: { userId: number } }> = async (c, next) => {
    c.set('userId', 1)
    await next()
  }

  app.use('/*', mockAuth)
  app.route('/', progress)
  return app
}

function createRequest(method: string, path: string): Request {
  return new Request(`http://localhost${path}`, { method, headers: { 'Content-Type': 'application/json' } })
}

describe('Progress Routes', () => {
  let app: ReturnType<typeof createTestApp>

  beforeEach(() => {
    resetDb()
    app = createTestApp()
  })

  describe('GET /', () => {
    it('returns an array (possibly empty) when no data exists', async () => {
      const env = createTestEnv()
      const res = await app.request(createRequest('GET', '/'), {}, env)
      expect(res.status).toBe(200)
      const data: any = await res.json()
      expect(Array.isArray(data)).toBe(true)
    })
  })

  describe('GET /:exerciseId', () => {
    it('returns an array (possibly empty) for any exercise', async () => {
      const env = createTestEnv()
      const res = await app.request(createRequest('GET', '/1'), {}, env)
      expect(res.status).toBe(200)
      const data: any = await res.json()
      expect(Array.isArray(data)).toBe(true)
    })
  })
})
