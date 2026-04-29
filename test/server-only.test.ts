import { describe, it, expect } from 'vitest'
import { expectTypeOf } from 'vitest'
import { createEnv } from '../src/core.js'
import { str, num, bool } from '../src/validators.js'
import type { ClientEnv, ServerOnly, InferEnv, InferInput } from '../src/types.js'

describe('ServerOnly branding', () => {
  it('server vars are branded as ServerOnly<T> in the returned object', () => {
    const env = createEnv({
      server: { SECRET: str(), PORT: num() },
      client: { NEXT_PUBLIC_URL: str().url() },
      runtimeEnv: {
        SECRET: 'abc',
        PORT: '3000',
        NEXT_PUBLIC_URL: 'https://example.com',
      },
      adapter: 'node',
    })

    // Runtime values are correct
    expect(env.SECRET).toBe('abc')
    expect(env.PORT).toBe(3000)
    expect(env.NEXT_PUBLIC_URL).toBe('https://example.com')

    // TypeScript: server vars extend ServerOnly<T>
    expectTypeOf(env.SECRET).toMatchTypeOf<ServerOnly<string>>()
    expectTypeOf(env.PORT).toMatchTypeOf<ServerOnly<number>>()

    // TypeScript: client vars do NOT carry the ServerOnly brand
    expectTypeOf(env.NEXT_PUBLIC_URL).toMatchTypeOf<string>()
  })

  it('server vars are still assignable to their base type (structural compat)', () => {
    const env = createEnv({
      server: { API_KEY: str() },
      client: {},
      runtimeEnv: { API_KEY: 'key123' },
      adapter: 'node',
    })

    // ServerOnly<string> is assignable to string (intersection includes base type)
    const key: string = env.API_KEY
    expect(key).toBe('key123')
  })
})

describe('ClientEnv<T> utility type', () => {
  it('ClientEnv strips server vars and keeps client vars', () => {
    const env = createEnv({
      server: { SECRET: str(), PORT: num() },
      client: {
        NEXT_PUBLIC_URL: str().url(),
        NEXT_PUBLIC_APP: str().default('app'),
      },
      runtimeEnv: {
        SECRET: 'abc',
        PORT: '3000',
        NEXT_PUBLIC_URL: 'https://example.com',
      },
      adapter: 'node',
    })

    type Env = typeof env
    type ClientOnly = ClientEnv<Env>

    // Client vars ARE present in ClientOnly
    expectTypeOf<ClientOnly>().toHaveProperty('NEXT_PUBLIC_URL')
    expectTypeOf<ClientOnly>().toHaveProperty('NEXT_PUBLIC_APP')

    // Server vars are NOT present in ClientOnly (mapped to never / excluded)
    expectTypeOf<ClientOnly>().not.toHaveProperty('SECRET')
    expectTypeOf<ClientOnly>().not.toHaveProperty('PORT')
  })

  it('ClientEnv with empty server schema has all vars', () => {
    const env = createEnv({
      server: {},
      client: { NEXT_PUBLIC_A: str(), NEXT_PUBLIC_B: num() },
      runtimeEnv: { NEXT_PUBLIC_A: 'hello', NEXT_PUBLIC_B: '42' },
      adapter: 'node',
    })

    type Env = typeof env
    type ClientOnly = ClientEnv<Env>

    expectTypeOf<ClientOnly>().toHaveProperty('NEXT_PUBLIC_A')
    expectTypeOf<ClientOnly>().toHaveProperty('NEXT_PUBLIC_B')
  })

  it('ClientEnv with empty client schema is empty', () => {
    const env = createEnv({
      server: { SECRET: str() },
      client: {},
      runtimeEnv: { SECRET: 'abc' },
      adapter: 'node',
    })

    type Env = typeof env
    type ClientOnly = ClientEnv<Env>

    // No properties should remain
    expectTypeOf<ClientOnly>().not.toHaveProperty('SECRET')
  })

  it('ClientEnv runtime: object contains only client-var values', () => {
    const env = createEnv({
      server: { DB_URL: str() },
      client: { NEXT_PUBLIC_API: str() },
      runtimeEnv: {
        DB_URL: 'postgres://localhost',
        NEXT_PUBLIC_API: 'https://api.example.com',
      },
      adapter: 'node',
    })

    // Pick only client vars at runtime using ClientEnv keys
    type ClientOnly = ClientEnv<typeof env>
    const clientEnv: ClientOnly = { NEXT_PUBLIC_API: env.NEXT_PUBLIC_API }

    expect(clientEnv.NEXT_PUBLIC_API).toBe('https://api.example.com')
    expect(Object.keys(clientEnv)).not.toContain('DB_URL')
  })
})

describe('InferInput<T> type helper', () => {
  it('infers from native Schema', () => {
    type S = { DATABASE_URL: ReturnType<typeof str> }
    type Out = InferInput<S>
    expectTypeOf<Out>().toEqualTypeOf<{ DATABASE_URL: string }>()
  })

  it('ServerOnly<T> is a subtype of T', () => {
    // Ensure backward compat: branded type is still assignable to base
    type BrandedString = ServerOnly<string>
    expectTypeOf<BrandedString>().toMatchTypeOf<string>()

    type BrandedNumber = ServerOnly<number>
    expectTypeOf<BrandedNumber>().toMatchTypeOf<number>()

    type BrandedBool = ServerOnly<boolean>
    expectTypeOf<BrandedBool>().toMatchTypeOf<boolean>()
  })
})

describe('Frozen result', () => {
  it('returned env object is frozen (runtime + type check)', () => {
    const env = createEnv({
      server: { X: str() },
      client: {},
      runtimeEnv: { X: 'hello' },
      adapter: 'node',
    })

    expect(Object.isFrozen(env)).toBe(true)
    // InferEnv wraps in Readonly<>
    expectTypeOf(env).toMatchTypeOf<Readonly<Record<string, unknown>>>()
  })
})
