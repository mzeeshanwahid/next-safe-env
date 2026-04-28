import { describe, it, expect } from 'vitest'
import { EnvValidationError, FieldError } from '../src/errors.js'
import type { ValidationFailure, ValidationStats } from '../src/types.js'

const stats: ValidationStats = {
  serverTotal: 3,
  serverFailed: 2,
  clientTotal: 2,
  clientFailed: 0,
}

const failures: ValidationFailure[] = [
  {
    field: 'DATABASE_URL',
    expected: 'valid URL',
    received: 'postgres-localhost',
    message: 'Expected valid URL. Got: "postgres-localhost"',
  },
  {
    field: 'JWT_SECRET',
    expected: 'length >= 32',
    received: 'length 12',
    message: 'Expected length >= 32. Got: "length 12"',
  },
]

describe('FieldError', () => {
  it('constructs with correct properties', () => {
    const err = new FieldError('MY_VAR', 'valid URL', 'bad-value')
    expect(err.field).toBe('MY_VAR')
    expect(err.expected).toBe('valid URL')
    expect(err.received).toBe('bad-value')
    expect(err.message).toBe('Expected valid URL. Got: "bad-value"')
    expect(err.name).toBe('FieldError')
  })

  it('toFailure() returns a ValidationFailure object', () => {
    const err = new FieldError('PORT', '>= 1', '0')
    const failure = err.toFailure()
    expect(failure).toEqual({
      field: 'PORT',
      expected: '>= 1',
      received: '0',
      message: 'Expected >= 1. Got: "0"',
    })
  })

  it('is an instance of Error', () => {
    expect(new FieldError('X', 'y', 'z')).toBeInstanceOf(Error)
  })
})

describe('EnvValidationError', () => {
  it('constructs with failures and stats', () => {
    const err = new EnvValidationError(failures, stats)
    expect(err.failures).toBe(failures)
    expect(err.stats).toBe(stats)
    expect(err.name).toBe('EnvValidationError')
    expect(err.message).toContain('[next-safe-env]')
  })

  it('is an instance of Error', () => {
    expect(new EnvValidationError([], stats)).toBeInstanceOf(Error)
  })

  describe('format()', () => {
    it('includes the error count in the header', () => {
      const output = new EnvValidationError(failures, stats).format()
      expect(output).toContain('2 error(s)')
    })

    it('includes each failing field name', () => {
      const output = new EnvValidationError(failures, stats).format()
      expect(output).toContain('DATABASE_URL')
      expect(output).toContain('JWT_SECRET')
    })

    it('includes the server/client summary line', () => {
      const output = new EnvValidationError(failures, stats).format()
      expect(output).toContain('Server vars:  1 valid, 2 invalid')
      expect(output).toContain('Client vars:  2 valid, 0 invalid')
    })

    it('includes the restart reminder', () => {
      const output = new EnvValidationError(failures, stats).format()
      expect(output).toContain('restart')
    })

    it('aligns field names with padEnd', () => {
      const longField: ValidationFailure = {
        field: 'VERY_LONG_FIELD_NAME_HERE',
        expected: 'string',
        received: 'undefined',
        message: 'Expected required string. Got: "undefined"',
      }
      const output = new EnvValidationError([longField], {
        serverTotal: 1,
        serverFailed: 1,
        clientTotal: 0,
        clientFailed: 0,
      }).format()
      expect(output).toContain('VERY_LONG_FIELD_NAME_HERE')
    })
  })

  describe('toJSON()', () => {
    it('returns a serialisable object', () => {
      const err = new EnvValidationError(failures, stats)
      const json = err.toJSON() as Record<string, unknown>
      expect(json['error']).toBe('EnvValidationError')
      expect(json['failures']).toBe(failures)
      expect(json['stats']).toBe(stats)
    })

    it('is JSON-serialisable without throwing', () => {
      const err = new EnvValidationError(failures, stats)
      expect(() => JSON.stringify(err.toJSON())).not.toThrow()
    })
  })
})
