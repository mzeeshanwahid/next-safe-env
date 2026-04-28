import type { ValidationFailure, ValidationStats } from './types.js'

/**
 * Thrown by individual validators when a single field fails. The engine
 * catches these and accumulates them into an EnvValidationError so the user
 * sees every problem at once.
 */
export class FieldError extends Error {
  readonly field: string
  readonly expected: string
  readonly received: string

  constructor(field: string, expected: string, received: string) {
    const message = `Expected ${expected}. Got: "${received}"`
    super(message)
    this.name = 'FieldError'
    this.field = field
    this.expected = expected
    this.received = received
  }

  toFailure(): ValidationFailure {
    return {
      field: this.field,
      expected: this.expected,
      received: this.received,
      message: this.message,
    }
  }
}

/**
 * Thrown (or passed to onValidationError) when one or more env vars fail
 * validation. Contains the full list of failures and human-readable formatting.
 */
export class EnvValidationError extends Error {
  readonly failures: ValidationFailure[]
  readonly stats: ValidationStats

  constructor(failures: ValidationFailure[], stats: ValidationStats) {
    super('[next-safe-env] Environment validation failed')
    this.name = 'EnvValidationError'
    this.failures = failures
    this.stats = stats
  }

  format(): string {
    const padLen = Math.max(20, ...this.failures.map((f) => f.field.length))

    const lines: string[] = [
      '',
      `[next-safe-env] Environment validation failed — ${this.failures.length} error(s):`,
      '',
    ]

    for (const f of this.failures) {
      lines.push(`  ✗ ${f.field.padEnd(padLen)} — ${f.message}`)
    }

    const { serverTotal, serverFailed, clientTotal, clientFailed } = this.stats
    lines.push('')
    lines.push(`  Server vars:  ${serverTotal - serverFailed} valid, ${serverFailed} invalid`)
    lines.push(`  Client vars:  ${clientTotal - clientFailed} valid, ${clientFailed} invalid`)
    lines.push('')
    lines.push(
      '  Set the correct values in your .env file or deployment environment and restart.',
    )
    lines.push('')

    return lines.join('\n')
  }

  toJSON(): unknown {
    return {
      error: 'EnvValidationError',
      failures: this.failures,
      stats: this.stats,
    }
  }
}
