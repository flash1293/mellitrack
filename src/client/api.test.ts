import { describe, it, expect, vi, beforeEach } from 'vitest'
import { api } from './api'

// Mock global fetch
const mockFetch = vi.fn()
globalThis.fetch = mockFetch

// Mock window.dispatchEvent and CustomEvent
globalThis.CustomEvent = vi.fn() as any
globalThis.window = {
  ...globalThis.window,
  dispatchEvent: vi.fn(),
  location: { pathname: '/' },
} as any

describe('api', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('login sends POST request to /api/auth/login', async () => {
    mockFetch.mockResolvedValueOnce({
      status: 200,
      ok: true,
      json: () => Promise.resolve({ success: true, userId: 1 }),
    })

    const result = await api.login('testuser', 'test1234')
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/auth/login',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ username: 'testuser', password: 'test1234' }),
        credentials: 'include',
      })
    )
    expect(result.success).toBe(true)
  })

  it('register sends POST request', async () => {
    mockFetch.mockResolvedValueOnce({
      status: 200,
      ok: true,
      json: () => Promise.resolve({ success: true, userId: 2 }),
    })

    const result = await api.register('newuser', 'newpass123')
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/auth/register',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ username: 'newuser', password: 'newpass123' }),
      })
    )
    expect(result.success).toBe(true)
  })

  it('getExercises returns exercise list', async () => {
    const exercises = [{ id: 1, name: 'Bench Press', categories: [] }]
    mockFetch.mockResolvedValueOnce({
      status: 200,
      ok: true,
      json: () => Promise.resolve(exercises),
    })

    const result = await api.getExercises()
    expect(result).toEqual(exercises)
  })

  it('getTrainings returns training list', async () => {
    const trainings = [{ id: 1, date: '2024-05-15', category_id: 1, category_name: 'Upper Body', exercise_count: 3 }]
    mockFetch.mockResolvedValueOnce({
      status: 200,
      ok: true,
      json: () => Promise.resolve(trainings),
    })

    const result = await api.getTrainings()
    expect(mockFetch).toHaveBeenCalledWith('/api/trainings', expect.any(Object))
    expect(result).toEqual(trainings)
  })

  it('throws on 401 response for non-auth endpoints', async () => {
    mockFetch.mockResolvedValueOnce({
      status: 401,
      ok: false,
      json: () => Promise.resolve({ error: 'Unauthorized' }),
    })

    await expect(api.getExercises()).rejects.toThrow('Unauthorized')
  })

  it('throws on generic error response', async () => {
    mockFetch.mockResolvedValueOnce({
      status: 400,
      ok: false,
      json: () => Promise.resolve({ error: 'Bad request' }),
    })

    await expect(api.getExercises()).rejects.toThrow('Bad request')
  })

  it('includes credentials in all requests', async () => {
    mockFetch.mockResolvedValueOnce({
      status: 200,
      ok: true,
      json: () => Promise.resolve([]),
    })

    await api.getCategories()
    expect(mockFetch.mock.calls[0][1].credentials).toBe('include')
  })

  it('createExercise sends POST with name and category_ids', async () => {
    mockFetch.mockResolvedValueOnce({
      status: 200,
      ok: true,
      json: () => Promise.resolve({ success: true, id: 1 }),
    })

    await api.createExercise({ name: 'Pull Up', category_ids: [1, 2] })
    const callBody = JSON.parse(mockFetch.mock.calls[0][1].body as string)
    expect(callBody).toEqual({ name: 'Pull Up', category_ids: [1, 2] })
  })
})
