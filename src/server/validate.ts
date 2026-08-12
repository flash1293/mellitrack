// Simple request body validation helpers
// All return null on success or an error message string on failure

export function validateString(val: unknown, field: string): string | null {
  if (typeof val !== 'string' || val.trim().length === 0) {
    return `${field} must be a non-empty string`
  }
  return null
}

export function validateNumber(val: unknown, field: string): string | null {
  if (typeof val !== 'number' || isNaN(val)) {
    return `${field} must be a number`
  }
  return null
}

export function validateNumberArray(val: unknown, field: string): string | null {
  if (!Array.isArray(val) || !val.every((v) => typeof v === 'number' && !isNaN(v))) {
    return `${field} must be an array of numbers`
  }
  if (val.length === 0) {
    return `${field} must not be empty`
  }
  return null
}

export function validateOptionalNumberArray(val: unknown, field: string): string | null {
  if (val === undefined) return null
  return validateNumberArray(val, field)
}

export function validatePositiveNumber(val: unknown, field: string): string | null {
  const numErr = validateNumber(val, field)
  if (numErr) return numErr
  if ((val as number) <= 0) {
    return `${field} must be a positive number`
  }
  return null
}

export function validateNonEmptyArray(val: unknown, field: string): string | null {
  if (!Array.isArray(val) || val.length === 0) {
    return `${field} must be a non-empty array`
  }
  return null
}
