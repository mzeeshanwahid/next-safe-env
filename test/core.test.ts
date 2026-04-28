import { describe, it, expect } from 'vitest'
import { createEnv } from '../src/core.js'
import { str, num, bool } from '../src/validators.js'

describe('createEnv', () => {
  it('returns a typed object when all vars are valid', () => {
    const env = createEnv({
      server: { DATABASE_URL: str().url() },
      client: { NEXT_PUBLIC_APP: str().default('test') },
      runtimeEnv: { DATABASE_URL: 'https://db.example.com' },
      adapter: 'node',
    })

    expect(env.DATABASE_URL).toBe('https://db.example.com')
    expect(env.NEXT_PUBLIC_APP).toBe('test')
  })

  it('coerces types — PORT arrives as string, returned as number', () => {
    const env = createEnv({
      server: { PORT: num().port() },
      client: {},
      runtimeEnv: { PORT: '3000' },
      adapter: 'node',
    })
    expect(env.PORT).toBe(3000)
    expect(typeof env.PORT).toBe('number')
  })

  it('collects all failures before reporting — does not short-circuit', () => {
    const collected: string[] = []

    expect(() =>
      createEnv({
        server: { A: str(), B: num(), C: bool() },
        client: {},
        runtimeEnv: {},
        adapter: 'node',
        onValidationError: (err) => {
          collected.push(...err.failures.map((f) => f.field))
          throw err
        },
      }),
    ).toThrow()

    expect(collected).toEqual(['A', 'B', 'C'])
  })

  it('returns a frozen object', () => {
    const env = createEnv({
      server: { SECRET: str() },
      client: {},
      runtimeEnv: { SECRET: 'abc' },
      adapter: 'node',
    })

    expect(Object.isFrozen(env)).toBe(true)
    expect(() => {
      ;(env as Record<string, unknown>)['SECRET'] = 'hacked'
    }).toThrow()
  })

  it('skips validation when skipValidation is true', () => {
    expect(() =>
      createEnv({
        server: { MISSING: str() },
        client: {},
        runtimeEnv: {},
        adapter: 'node',
        skipValidation: true,
      }),
    ).not.toThrow()
  })

  it('calls onValidationError instead of process.exit when provided', () => {
    let called = false

    expect(() =>
      createEnv({
        server: { REQUIRED: str() },
        client: {},
        runtimeEnv: {},
        adapter: 'node',
        onValidationError: (err) => {
          called = true
          throw err
        },
      }),
    ).toThrow()

    expect(called).toBe(true)
  })

  it('server and client vars are merged into one object', () => {
    const env = createEnv({
      server: { SECRET: str() },
      client: { NEXT_PUBLIC_URL: str().url() },
      runtimeEnv: {
        SECRET: 'my-secret',
        NEXT_PUBLIC_URL: 'https://example.com',
      },
      adapter: 'node',
    })

    expect(env.SECRET).toBe('my-secret')
    expect(env.NEXT_PUBLIC_URL).toBe('https://example.com')
  })

  it('throws unknown adapter name immediately', () => {
    expect(() =>
      createEnv({
        server: {},
        client: {},
        runtimeEnv: {},
        adapter: 'unknown' as 'node',
      }),
    ).toThrow('Unknown adapter')
  })

  it('onValidationError receives formatted failure details', () => {
    let receivedMessage = ''

    expect(() =>
      createEnv({
        server: { BAD_URL: str().url() },
        client: {},
        runtimeEnv: { BAD_URL: 'not-a-url' },
        adapter: 'node',
        onValidationError: (err) => {
          receivedMessage = err.format()
          throw err
        },
      }),
    ).toThrow()

    expect(receivedMessage).toContain('BAD_URL')
    expect(receivedMessage).toContain('valid URL')
  })
})
