import { describe, it, expect } from 'vitest'
import { createEnv } from '../src/core.js'
import { str } from '../src/validators.js'

describe('edge adapter', () => {
  it('returns only NEXT_PUBLIC_ vars in the result (afterValidate strips server vars)', () => {
    const env = createEnv({
      server: { SECRET: str() },
      client: { NEXT_PUBLIC_URL: str().url() },
      runtimeEnv: {
        SECRET: 'my-secret',
        NEXT_PUBLIC_URL: 'https://example.com',
      },
      adapter: 'edge',
    }) as Record<string, unknown>

    expect(env['NEXT_PUBLIC_URL']).toBe('https://example.com')
    // SERVER key is stripped by the edge adapter's afterValidate
    expect(env['SECRET']).toBeUndefined()
  })

  it('validates server vars before stripping them — missing required server var still fails', () => {
    expect(() =>
      createEnv({
        server: { SECRET: str() },
        client: { NEXT_PUBLIC_URL: str().url() },
        runtimeEnv: { NEXT_PUBLIC_URL: 'https://example.com' },
        adapter: 'edge',
        onValidationError: (err) => {
          throw err
        },
      }),
    ).toThrow()
  })

  it('optional server vars pass even when absent', () => {
    expect(() =>
      createEnv({
        server: { OPTIONAL_SECRET: str().optional() },
        client: { NEXT_PUBLIC_URL: str().url() },
        runtimeEnv: { NEXT_PUBLIC_URL: 'https://example.com' },
        adapter: 'edge',
      }),
    ).not.toThrow()
  })

  it('does not require NEXT_PUBLIC_ prefix on client keys (unlike nextjs adapter)', () => {
    expect(() =>
      createEnv({
        server: {},
        client: { API_URL: str() },
        runtimeEnv: { API_URL: 'https://example.com' },
        adapter: 'edge',
      }),
    ).not.toThrow()
  })
})
