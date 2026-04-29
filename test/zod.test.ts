import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import { createEnv } from '../src/core.js'
import { str } from '../src/validators.js'

describe('Zod interop', () => {
  describe('Zod server schema', () => {
    it('validates successfully and returns typed values', () => {
      const env = createEnv({
        server: z.object({
          DATABASE_URL: z.string().url(),
          PORT: z.coerce.number().int().min(1).max(65535).default(3000),
        }),
        client: {},
        runtimeEnv: {
          DATABASE_URL: 'https://db.example.com',
        },
        adapter: 'node',
      })

      expect(env.DATABASE_URL).toBe('https://db.example.com')
      expect(env.PORT).toBe(3000)
    })

    it('collects all Zod validation failures — does not short-circuit', () => {
      const collected: string[] = []

      expect(() =>
        createEnv({
          server: z.object({
            DATABASE_URL: z.string().url(),
            PORT: z.coerce.number().int().min(1).max(65535),
          }),
          client: {},
          runtimeEnv: { DATABASE_URL: 'not-a-url', PORT: '99999' },
          adapter: 'node',
          onValidationError: (err) => {
            collected.push(...err.failures.map((f) => f.field))
            throw err
          },
        }),
      ).toThrow()

      expect(collected).toContain('DATABASE_URL')
      expect(collected).toContain('PORT')
    })

    it('handles optional Zod fields', () => {
      const env = createEnv({
        server: z.object({
          DATABASE_URL: z.string().url(),
          REDIS_URL: z.string().url().optional(),
        }),
        client: {},
        runtimeEnv: { DATABASE_URL: 'https://db.example.com' },
        adapter: 'node',
      })

      expect(env.DATABASE_URL).toBe('https://db.example.com')
      expect(env.REDIS_URL).toBeUndefined()
    })

    it('uses Zod default values when var is absent', () => {
      const env = createEnv({
        server: z.object({
          NODE_ENV: z
            .enum(['development', 'production', 'test'])
            .default('development'),
        }),
        client: {},
        runtimeEnv: {},
        adapter: 'node',
      })

      expect(env.NODE_ENV).toBe('development')
    })
  })

  describe('Zod client schema', () => {
    it('validates client schema via Zod', () => {
      const env = createEnv({
        server: {},
        client: z.object({
          NEXT_PUBLIC_APP_NAME: z.string().default('My App'),
          NEXT_PUBLIC_DEBUG: z
            .enum(['true', 'false'])
            .transform((v) => v === 'true')
            .default('false'),
        }),
        runtimeEnv: {},
        adapter: 'node',
      })

      expect(env.NEXT_PUBLIC_APP_NAME).toBe('My App')
      expect(env.NEXT_PUBLIC_DEBUG).toBe(false)
    })

    it('collects client schema Zod failures', () => {
      const collected: string[] = []

      expect(() =>
        createEnv({
          server: {},
          client: z.object({
            NEXT_PUBLIC_API_URL: z.string().url(),
            NEXT_PUBLIC_COUNT: z.coerce.number().int().positive(),
          }),
          runtimeEnv: {
            NEXT_PUBLIC_API_URL: 'bad-url',
            NEXT_PUBLIC_COUNT: '-5',
          },
          adapter: 'node',
          onValidationError: (err) => {
            collected.push(...err.failures.map((f) => f.field))
            throw err
          },
        }),
      ).toThrow()

      expect(collected).toContain('NEXT_PUBLIC_API_URL')
      expect(collected).toContain('NEXT_PUBLIC_COUNT')
    })
  })

  describe('mixed Zod + native schemas', () => {
    it('accepts Zod server schema with native client schema', () => {
      const env = createEnv({
        server: z.object({ SECRET: z.string().min(8) }),
        client: { NEXT_PUBLIC_APP: str().default('app') },
        runtimeEnv: { SECRET: 'supersecret' },
        adapter: 'node',
      })

      expect(env.SECRET).toBe('supersecret')
      expect(env.NEXT_PUBLIC_APP).toBe('app')
    })

    it('accepts native server schema with Zod client schema', () => {
      const env = createEnv({
        server: { API_KEY: str() },
        client: z.object({
          NEXT_PUBLIC_URL: z.string().url().default('https://example.com'),
        }),
        runtimeEnv: { API_KEY: 'key123' },
        adapter: 'node',
      })

      expect(env.API_KEY).toBe('key123')
      expect(env.NEXT_PUBLIC_URL).toBe('https://example.com')
    })

    it('collects failures from both Zod server and native client', () => {
      const collected: string[] = []

      expect(() =>
        createEnv({
          server: z.object({ DATABASE_URL: z.string().url() }),
          client: { NEXT_PUBLIC_X: str().url() },
          runtimeEnv: { DATABASE_URL: 'bad', NEXT_PUBLIC_X: 'bad' },
          adapter: 'node',
          onValidationError: (err) => {
            collected.push(...err.failures.map((f) => f.field))
            throw err
          },
        }),
      ).toThrow()

      expect(collected).toContain('DATABASE_URL')
      expect(collected).toContain('NEXT_PUBLIC_X')
    })
  })

  describe('Zod with Next.js adapter', () => {
    it('enforces NEXT_PUBLIC_ prefix on Zod client schema keys', () => {
      expect(() =>
        createEnv({
          server: {},
          client: z.object({ API_URL: z.string().url() }),
          runtimeEnv: { API_URL: 'https://example.com' },
          adapter: 'nextjs',
        }),
      ).toThrow('NEXT_PUBLIC_')
    })

    it('passes when Zod client keys have NEXT_PUBLIC_ prefix', () => {
      expect(() =>
        createEnv({
          server: {},
          client: z.object({
            NEXT_PUBLIC_URL: z.string().url(),
          }),
          runtimeEnv: { NEXT_PUBLIC_URL: 'https://example.com' },
          adapter: 'nextjs',
        }),
      ).not.toThrow()
    })
  })

  describe('skipValidation with Zod schema', () => {
    it('skips Zod validation when skipValidation is true', () => {
      expect(() =>
        createEnv({
          server: z.object({ REQUIRED_URL: z.string().url() }),
          client: {},
          runtimeEnv: {},
          adapter: 'node',
          skipValidation: true,
        }),
      ).not.toThrow()
    })
  })

  describe('error formatting', () => {
    it('includes Zod field names in formatted error output', () => {
      let message = ''

      expect(() =>
        createEnv({
          server: z.object({ DATABASE_URL: z.string().url() }),
          client: {},
          runtimeEnv: { DATABASE_URL: 'not-a-url' },
          adapter: 'node',
          onValidationError: (err) => {
            message = err.format()
            throw err
          },
        }),
      ).toThrow()

      expect(message).toContain('DATABASE_URL')
    })

    it('reports correct server/client counts in stats', () => {
      let serverTotal = 0
      let clientTotal = 0

      expect(() =>
        createEnv({
          server: z.object({
            A: z.string(),
            B: z.string(),
          }),
          client: z.object({
            C: z.string(),
          }),
          runtimeEnv: {},
          adapter: 'node',
          onValidationError: (err) => {
            serverTotal = err.stats.serverTotal
            clientTotal = err.stats.clientTotal
            throw err
          },
        }),
      ).toThrow()

      expect(serverTotal).toBe(2)
      expect(clientTotal).toBe(1)
    })
  })

  describe('Zod type coercion and transforms', () => {
    it('applies Zod coercion (string to number)', () => {
      const env = createEnv({
        server: z.object({ PORT: z.coerce.number() }),
        client: {},
        runtimeEnv: { PORT: '8080' },
        adapter: 'node',
      })

      expect(env.PORT).toBe(8080)
      expect(typeof env.PORT).toBe('number')
    })

    it('applies Zod transforms', () => {
      const env = createEnv({
        server: z.object({
          LOG_LEVEL: z.string().transform((v) => v.toUpperCase()),
        }),
        client: {},
        runtimeEnv: { LOG_LEVEL: 'debug' },
        adapter: 'node',
      })

      expect(env.LOG_LEVEL).toBe('DEBUG')
    })
  })
})
