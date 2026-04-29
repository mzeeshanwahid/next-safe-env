import { describe, it, expect, vi, afterEach } from 'vitest'
import { createEnv } from '../src/core.js'
import { str, url } from '../src/validators.js'

describe('vite adapter', () => {
  afterEach(() => {
    // Restore globalThis.window after each test that may set it
    // @ts-expect-error — deleting window from globalThis for test isolation
    delete globalThis.window
  })

  it('passes when all client keys are VITE_ prefixed', () => {
    expect(() =>
      createEnv({
        server: { SECRET: str() },
        client: { VITE_API_URL: url() },
        runtimeEnv: {
          SECRET: 'abc',
          VITE_API_URL: 'https://api.example.com',
        },
        adapter: 'vite',
      }),
    ).not.toThrow()
  })

  it('throws immediately when a client key lacks VITE_ prefix', () => {
    expect(() =>
      createEnv({
        server: {},
        client: { API_URL: url() },
        runtimeEnv: { API_URL: 'https://example.com' },
        adapter: 'vite',
      }),
    ).toThrow('VITE_')
  })

  it('throws the correct error message for missing VITE_ prefix', () => {
    expect(() =>
      createEnv({
        server: {},
        client: { REACT_APP_URL: str() },
        runtimeEnv: { REACT_APP_URL: 'https://example.com' },
        adapter: 'vite',
      }),
    ).toThrow('Vite adapter')
  })

  it('server keys are not required to have VITE_ prefix', () => {
    expect(() =>
      createEnv({
        server: { DATABASE_URL: url(), API_KEY: str() },
        client: {},
        runtimeEnv: {
          DATABASE_URL: 'https://db.example.com',
          API_KEY: 'secret',
        },
        adapter: 'vite',
      }),
    ).not.toThrow()
  })

  it('validates server and client vars independently', () => {
    const failures: string[] = []

    expect(() =>
      createEnv({
        server: { DATABASE_URL: url(), PORT: str() },
        client: { VITE_APP_NAME: str() },
        runtimeEnv: {
          DATABASE_URL: 'bad-url',
          PORT: undefined,
          VITE_APP_NAME: 'my-app',
        },
        adapter: 'vite',
        onValidationError: (err) => {
          failures.push(...err.failures.map((f) => f.field))
          throw err
        },
      }),
    ).toThrow()

    expect(failures).toContain('DATABASE_URL')
    expect(failures).not.toContain('VITE_APP_NAME')
  })

  it('strips server vars in browser context (window defined)', () => {
    // Simulate browser context
    ;(globalThis as Record<string, unknown>)['window'] = {}

    const env = createEnv({
      server: { SECRET: str() },
      client: { VITE_APP_NAME: str() },
      runtimeEnv: {
        SECRET: 'my-secret',
        VITE_APP_NAME: 'my-app',
      },
      adapter: 'vite',
    })

    expect((env as Record<string, unknown>)['SECRET']).toBeUndefined()
    expect(env.VITE_APP_NAME).toBe('my-app')
  })

  it('keeps all vars in server context (no window)', () => {
    // Ensure window is not set (server context)
    // @ts-expect-error — deleting window from globalThis
    delete globalThis.window

    const env = createEnv({
      server: { SECRET: str() },
      client: { VITE_APP_NAME: str() },
      runtimeEnv: {
        SECRET: 'my-secret',
        VITE_APP_NAME: 'my-app',
      },
      adapter: 'vite',
    })

    expect(env.SECRET).toBe('my-secret')
    expect(env.VITE_APP_NAME).toBe('my-app')
  })

  it('works with optional and default values', () => {
    const env = createEnv({
      server: { DATABASE_URL: url() },
      client: {
        VITE_APP_NAME: str().default('My Vite App'),
        VITE_ENABLE_ANALYTICS: str().optional(),
      },
      runtimeEnv: {
        DATABASE_URL: 'https://db.example.com',
      },
      adapter: 'vite',
    })

    expect(env.VITE_APP_NAME).toBe('My Vite App')
    expect(env.VITE_ENABLE_ANALYTICS).toBeUndefined()
  })

  it('auto-detects vite adapter from VITE_ client keys (with console warning)', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    expect(() =>
      createEnv({
        server: {},
        client: { VITE_API_URL: url() },
        runtimeEnv: { VITE_API_URL: 'https://api.example.com' },
        // adapter not specified — should auto-detect from VITE_ prefix
      }),
    ).not.toThrow()

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('VITE_'),
    )

    warnSpy.mockRestore()
  })

  it('skipValidation bypasses VITE_ prefix enforcement', () => {
    expect(() =>
      createEnv({
        server: {},
        client: { NOT_VITE: str() },
        runtimeEnv: {},
        adapter: 'vite',
        skipValidation: true,
      }),
    ).not.toThrow()
  })
})
