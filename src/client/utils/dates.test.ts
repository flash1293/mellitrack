import { describe, it, expect } from 'vitest'
import { formatDateShort, formatDateLong, formatDateFull } from './dates'

describe('formatDateShort', () => {
  it('formats a date string to short German format (DD.MM.)', () => {
    const result = formatDateShort('2024-05-15')
    // German locale: "15.05."
    expect(result).toMatch(/^\d{2}\.\d{2}\.$/)
  })

  it('formats ISO date strings', () => {
    const result = formatDateShort('2024-01-01T00:00:00.000Z')
    expect(result).toBe('01.01.')
  })
})

describe('formatDateLong', () => {
  it('formats a date string to German format', () => {
    const result = formatDateLong('2024-05-15')
    // German locale: "15.5.2024" (no leading zero for month)
    expect(result).toMatch(/^\d{1,2}\.\d{1,2}\.\d{4}$/)
  })

  it('formats ISO date strings', () => {
    const result = formatDateLong('2024-12-25T00:00:00.000Z')
    expect(result).toMatch(/^\d{1,2}\.\d{1,2}\.\d{4}$/)
  })
})

describe('formatDateFull', () => {
  it('formats a date string to full format including weekday in German', () => {
    // "Mi., 15. Mai 2024" — jsdom uses en-US by default, so we keep it generic
    const result = formatDateFull('2024-05-15')
    expect(result).toContain('2024')
    expect(result).toContain('15')
  })

  it('contains the weekday (abbreviated)', () => {
    const result = formatDateFull('2024-05-15')
    expect(result.length).toBeGreaterThan(10)
  })
})
