import { describe, it, expect } from 'vitest'
import { createEnv } from '../src/core.js'
import { str, num, bool } from '../src/validators.js'

describe('nextjs adapter', () => {
  it('passes when all client keys are NEXT_PUBLIC_ prefixed', () => {
    expect(() =>
      createEnv({
        server: { SECRET: str() },
        client: { NEXT_PUBLIC_URL: str().url() },
        runtimeEnv: {
          SECRET: 'abc',
          NEXT_PUBLIC_URL: 'https://example.com',
        },
        adapter: 'nextjs',
      }),
    ).not.toThrow()
  })

  it('throws immediately when a client key lacks NEXT_PUBLIC_ prefix', () => {
    expect(() =>
      createEnv({
        server: {},
        client: { API_URL: str() },
        runtimeEnv: { API_URL: 'https://example.com' },
        adapter: 'nextjs',
      }),
    ).toThrow('NEXT_PUBLIC_')
  })

  it('server keys are not required to have NEXT_PUBLIC_ prefix', () => {
    expect(() =>
      createEnv({
        server: { DATABASE_URL: str().url(), JWT_SECRET: str() },
        client: {},
        runtimeEnv: {
          DATABASE_URL: 'https://db.example.com',
          JWT_SECRET: 'super-secret',
        },
        adapter: 'nextjs',
      }),
    ).not.toThrow()
  })

  it('validates server and client vars independently', () => {
    const failures: string[] = []

    expect(() =>
      createEnv({
        server: { DATABASE_URL: str().url(), PORT: num().port() },
        client: { NEXT_PUBLIC_APP: str() },
        runtimeEnv: {
          DATABASE_URL: 'bad-url',
          PORT: '99999',
          NEXT_PUBLIC_APP: 'my-app',
        },
        adapter: 'nextjs',
        onValidationError: (err) => {
          failures.push(...err.failures.map((f) => f.field))
          throw err
        },
      }),
    ).toThrow()

    expect(failures).toContain('DATABASE_URL')
    expect(failures).toContain('PORT')
    expect(failures).not.toContain('NEXT_PUBLIC_APP')
  })

  it('works with optional and default values on both sides', () => {
    const env = createEnv({
      server: {
        DATABASE_URL: str().url(),
        SMTP_PORT: num().port().default(587),
      },
      client: {
        NEXT_PUBLIC_API_URL: str().url(),
        NEXT_PUBLIC_DEBUG: bool().default(false),
      },
      runtimeEnv: {
        DATABASE_URL: 'https://db.example.com',
        NEXT_PUBLIC_API_URL: 'https://api.example.com',
      },
      adapter: 'nextjs',
    })

    expect(env.SMTP_PORT).toBe(587)
    expect(env.NEXT_PUBLIC_DEBUG).toBe(false)
  })
})
