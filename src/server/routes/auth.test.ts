import { describe, it, expect, beforeEach } from 'vitest'
import auth from './auth'
import { resetDb, createTestEnv } from '../test-utils'

const app = auth

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

describe('Auth Routes', () => {
  beforeEach(() => {
    resetDb()
  })

  describe('POST /register', () => {
    it('registers a new user', async () => {
      const env = createTestEnv()
      const res = await app.request(
        createRequest('POST', '/register', { username: 'testuser', password: 'test1234' }),
        {},
        env
      )
      expect(res.status).toBe(200)
      const data: any = await res.json()
      expect(data.success).toBe(true)
      expect(data.userId).toBeDefined()
    })

    it('returns 400 for empty username', async () => {
      const env = createTestEnv()
      const res = await app.request(
        createRequest('POST', '/register', { username: '', password: 'test1234' }),
        {},
        env
      )
      expect(res.status).toBe(400)
      const data: any = await res.json()
      expect(data.error).toContain('username')
    })

    it('returns 400 for empty password', async () => {
      const env = createTestEnv()
      const res = await app.request(
        createRequest('POST', '/register', { username: 'testuser', password: '' }),
        {},
        env
      )
      expect(res.status).toBe(400)
      const data: any = await res.json()
      expect(data.error).toContain('password')
    })

    it('returns 400 for short password (< 4 chars)', async () => {
      const env = createTestEnv()
      const res = await app.request(
        createRequest('POST', '/register', { username: 'testuser', password: 'abc' }),
        {},
        env
      )
      expect(res.status).toBe(400)
      const data: any = await res.json()
      expect(data.error).toContain('at least 4 characters')
    })

    it('returns 409 for duplicate username', async () => {
      const env = createTestEnv()
      // Register first user
      await app.request(
        createRequest('POST', '/register', { username: 'testuser', password: 'test1234' }),
        {},
        env
      )
      // Try to register same username again
      const res = await app.request(
        createRequest('POST', '/register', { username: 'testuser', password: 'other1234' }),
        {},
        env
      )
      expect(res.status).toBe(409)
      const data: any = await res.json()
      expect(data.error).toContain('already taken')
    })

    it('returns 400 for non-string username', async () => {
      const env = createTestEnv()
      const res = await app.request(
        createRequest('POST', '/register', { username: 123, password: 'test1234' }),
        {},
        env
      )
      expect(res.status).toBe(400)
    })

    it('returns 400 for non-string password', async () => {
      const env = createTestEnv()
      const res = await app.request(
        createRequest('POST', '/register', { username: 'testuser', password: 123 }),
        {},
        env
      )
      expect(res.status).toBe(400)
    })
  })

  describe('POST /login', () => {
    it('logs in with valid credentials', async () => {
      const env = createTestEnv()
      // Register first
      await app.request(
        createRequest('POST', '/register', { username: 'testuser', password: 'test1234' }),
        {},
        env
      )
      // Login
      const res = await app.request(
        createRequest('POST', '/login', { username: 'testuser', password: 'test1234' }),
        {},
        env
      )
      expect(res.status).toBe(200)
      const data: any = await res.json()
      expect(data.success).toBe(true)
    })

    it('returns 401 for wrong password', async () => {
      const env = createTestEnv()
      await app.request(
        createRequest('POST', '/register', { username: 'testuser', password: 'test1234' }),
        {},
        env
      )
      const res = await app.request(
        createRequest('POST', '/login', { username: 'testuser', password: 'wrongpass' }),
        {},
        env
      )
      expect(res.status).toBe(401)
      const data: any = await res.json()
      expect(data.error).toContain('Invalid')
    })

    it('returns 401 for non-existent user', async () => {
      const env = createTestEnv()
      const res = await app.request(
        createRequest('POST', '/login', { username: 'nobody', password: 'test1234' }),
        {},
        env
      )
      expect(res.status).toBe(401)
    })

    it('returns 400 for empty username on login', async () => {
      const env = createTestEnv()
      const res = await app.request(
        createRequest('POST', '/login', { username: '', password: 'test1234' }),
        {},
        env
      )
      expect(res.status).toBe(400)
    })
  })

  describe('POST /logout', () => {
    it('returns success on logout', async () => {
      const env = createTestEnv()
      const res = await app.request(
        createRequest('POST', '/logout'),
        {},
        env
      )
      expect(res.status).toBe(200)
      const data: any = await res.json()
      expect(data.success).toBe(true)
    })
  })

  describe('GET /check', () => {
    it('returns unauthenticated without session cookie', async () => {
      const env = createTestEnv()
      const res = await app.request(
        createRequest('GET', '/check'),
        {},
        env
      )
      expect(res.status).toBe(200)
      const data: any = await res.json()
      expect(data.authenticated).toBe(false)
    })

    it('returns authenticated with valid session cookie', async () => {
      const env = createTestEnv()
      // Register a user
      const regRes = await app.request(
        createRequest('POST', '/register', { username: 'testuser', password: 'test1234' }),
        {},
        env
      )
      // Extract the set-cookie header
      const cookies = regRes.headers.get('set-cookie') || ''

      // Make GET /check with the cookie
      const req = createRequest('GET', '/check')
      req.headers.set('Cookie', cookies)

      const res = await app.request(req, {}, env)
      expect(res.status).toBe(200)
      const data: any = await res.json()
      expect(data.authenticated).toBe(true)
      expect(data.username).toBe('testuser')
    })
  })
})
