import { describe, it, expect } from 'vitest'
import {
  validateString,
  validateNumber,
  validateNumberArray,
  validateOptionalNumberArray,
  validateNonEmptyArray,
} from './validate'

describe('validateString', () => {
  it('returns null for a valid non-empty string', () => {
    expect(validateString('hello', 'name')).toBeNull()
  })

  it('returns null for a string with whitespace', () => {
    expect(validateString('  hello  ', 'name')).toBeNull()
  })

  it('returns error for empty string', () => {
    expect(validateString('', 'name')).toBe('name must be a non-empty string')
  })

  it('returns error for whitespace-only string', () => {
    expect(validateString('   ', 'name')).toBe('name must be a non-empty string')
  })

  it('returns error for non-string values', () => {
    expect(validateString(123, 'name')).toBe('name must be a non-empty string')
    expect(validateString(null, 'name')).toBe('name must be a non-empty string')
    expect(validateString(undefined, 'name')).toBe('name must be a non-empty string')
    expect(validateString([], 'name')).toBe('name must be a non-empty string')
    expect(validateString({}, 'name')).toBe('name must be a non-empty string')
  })

  it('uses the provided field name in the error message', () => {
    expect(validateString('', 'username')).toBe('username must be a non-empty string')
    expect(validateString(0, 'email')).toBe('email must be a non-empty string')
  })
})

describe('validateNumber', () => {
  it('returns null for a valid number', () => {
    expect(validateNumber(42, 'count')).toBeNull()
    expect(validateNumber(0, 'count')).toBeNull()
    expect(validateNumber(-1, 'count')).toBeNull()
    expect(validateNumber(3.14, 'count')).toBeNull()
  })

  it('returns error for NaN', () => {
    expect(validateNumber(NaN, 'count')).toBe('count must be a number')
  })

  it('returns error for non-number values', () => {
    expect(validateNumber('42', 'count')).toBe('count must be a number')
    expect(validateNumber(null, 'count')).toBe('count must be a number')
    expect(validateNumber(undefined, 'count')).toBe('count must be a number')
    expect(validateNumber([], 'count')).toBe('count must be a number')
    expect(validateNumber({}, 'count')).toBe('count must be a number')
  })
})

describe('validateNumberArray', () => {
  it('returns null for a valid array of numbers', () => {
    expect(validateNumberArray([1, 2, 3], 'ids')).toBeNull()
    expect(validateNumberArray([42], 'ids')).toBeNull()
  })

  it('returns error for empty array', () => {
    expect(validateNumberArray([], 'ids')).toBe('ids must not be empty')
  })

  it('returns error if any element is not a number', () => {
    expect(validateNumberArray([1, '2', 3], 'ids')).toBe('ids must be an array of numbers')
    expect(validateNumberArray([1, null, 3], 'ids')).toBe('ids must be an array of numbers')
    expect(validateNumberArray([undefined], 'ids')).toBe('ids must be an array of numbers')
  })

  it('returns error for NaN in array', () => {
    expect(validateNumberArray([1, NaN], 'ids')).toBe('ids must be an array of numbers')
  })

  it('returns error for non-array values', () => {
    expect(validateNumberArray('hello', 'ids')).toBe('ids must be an array of numbers')
    expect(validateNumberArray(42, 'ids')).toBe('ids must be an array of numbers')
    expect(validateNumberArray(null, 'ids')).toBe('ids must be an array of numbers')
    expect(validateNumberArray(undefined, 'ids')).toBe('ids must be an array of numbers')
  })
})

describe('validateOptionalNumberArray', () => {
  it('returns null when value is undefined', () => {
    expect(validateOptionalNumberArray(undefined, 'ids')).toBeNull()
  })

  it('delegates to validateNumberArray when value is provided', () => {
    expect(validateOptionalNumberArray([1, 2], 'ids')).toBeNull()
    expect(validateOptionalNumberArray([], 'ids')).toBe('ids must not be empty')
    expect(validateOptionalNumberArray('bad', 'ids')).toBe('ids must be an array of numbers')
  })
})

describe('validateNonEmptyArray', () => {
  it('returns null for a non-empty array', () => {
    expect(validateNonEmptyArray([1], 'items')).toBeNull()
    expect(validateNonEmptyArray(['a', 'b'], 'items')).toBeNull()
    expect(validateNonEmptyArray([{}], 'items')).toBeNull()
  })

  it('returns error for empty array', () => {
    expect(validateNonEmptyArray([], 'items')).toBe('items must be a non-empty array')
  })

  it('returns error for non-array values', () => {
    expect(validateNonEmptyArray(null, 'items')).toBe('items must be a non-empty array')
    expect(validateNonEmptyArray(undefined, 'items')).toBe('items must be a non-empty array')
    expect(validateNonEmptyArray('string', 'items')).toBe('items must be a non-empty array')
    expect(validateNonEmptyArray(42, 'items')).toBe('items must be a non-empty array')
  })
})
