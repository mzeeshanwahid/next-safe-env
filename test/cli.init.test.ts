import { describe, it, expect } from 'vitest'
import { generateEnvTs, generateEnvExample } from '../src/cli/init.js'
import type { InitConfig } from '../src/cli/init.js'

// ---------------------------------------------------------------------------
// generateEnvTs
// ---------------------------------------------------------------------------

describe('generateEnvTs', () => {
  it('generates correct imports for used validator types', () => {
    const config: InitConfig = {
      adapter: 'node',
      server: [
        { name: 'DATABASE_URL', type: 'url', optional: false },
        { name: 'PORT', type: 'port', optional: false, default: 3000 },
      ],
      client: [],
    }
    const output = generateEnvTs(config)
    expect(output).toContain("import { createEnv, port, url } from 'next-safe-env'")
  })

  it('includes all imports for mixed types', () => {
    const config: InitConfig = {
      adapter: 'nextjs',
      server: [
        { name: 'SECRET', type: 'str', optional: false },
        { name: 'PORT', type: 'num', optional: false },
        { name: 'FLAG', type: 'bool', optional: false },
      ],
      client: [],
    }
    const output = generateEnvTs(config)
    expect(output).toContain('bool')
    expect(output).toContain('num')
    expect(output).toContain('str')
  })

  it('generates correct validator chain for url()', () => {
    const config: InitConfig = {
      adapter: 'node',
      server: [{ name: 'API_URL', type: 'url', optional: false }],
      client: [],
    }
    const output = generateEnvTs(config)
    expect(output).toContain('API_URL: url()')
  })

  it('generates port().default(number) — numeric literal, no quotes', () => {
    const config: InitConfig = {
      adapter: 'node',
      server: [{ name: 'PORT', type: 'port', optional: false, default: 3000 }],
      client: [],
    }
    const output = generateEnvTs(config)
    expect(output).toContain('port().default(3000)')
    expect(output).not.toContain("port().default('3000')")
  })

  it('generates num().default(number) — numeric literal, no quotes', () => {
    const config: InitConfig = {
      adapter: 'node',
      server: [{ name: 'TIMEOUT', type: 'num', optional: false, default: 30001 }],
      client: [],
    }
    const output = generateEnvTs(config)
    expect(output).toContain('num().default(30001)')
    expect(output).not.toContain("num().default('30001')")
  })

  it('generates bool().default(true) — boolean literal, no quotes', () => {
    const config: InitConfig = {
      adapter: 'node',
      server: [{ name: 'ENABLE_CACHE', type: 'bool', optional: false, default: true }],
      client: [],
    }
    const output = generateEnvTs(config)
    expect(output).toContain('bool().default(true)')
    expect(output).not.toContain("bool().default('true')")
  })

  it('generates bool().default(false) — boolean literal, no quotes', () => {
    const config: InitConfig = {
      adapter: 'node',
      server: [{ name: 'DEBUG', type: 'bool', optional: false, default: false }],
      client: [],
    }
    const output = generateEnvTs(config)
    expect(output).toContain('bool().default(false)')
    expect(output).not.toContain("bool().default('false')")
  })

  it('generates str().default() with a quoted string', () => {
    const config: InitConfig = {
      adapter: 'node',
      server: [{ name: 'LOG_LEVEL', type: 'str', optional: false, default: 'info' }],
      client: [],
    }
    const output = generateEnvTs(config)
    expect(output).toContain("str().default('info')")
  })

  it('generates .optional() on validator chain', () => {
    const config: InitConfig = {
      adapter: 'node',
      server: [{ name: 'REDIS_URL', type: 'url', optional: true }],
      client: [],
    }
    const output = generateEnvTs(config)
    expect(output).toContain('url().optional()')
  })

  it('generates .enum() on str validator', () => {
    const config: InitConfig = {
      adapter: 'node',
      server: [
        {
          name: 'NODE_ENV',
          type: 'str',
          optional: false,
          enum: ['development', 'production', 'test'],
        },
      ],
      client: [],
    }
    const output = generateEnvTs(config)
    expect(output).toContain("str().enum(['development', 'production', 'test'])")
  })

  it('generates process.env references in runtimeEnv for node adapter', () => {
    const config: InitConfig = {
      adapter: 'node',
      server: [{ name: 'DATABASE_URL', type: 'url', optional: false }],
      client: [],
    }
    const output = generateEnvTs(config)
    expect(output).toContain('DATABASE_URL: process.env.DATABASE_URL')
  })

  it('generates import.meta.env references for vite client vars', () => {
    const config: InitConfig = {
      adapter: 'vite',
      server: [],
      client: [{ name: 'VITE_API_URL', type: 'url', optional: false }],
    }
    const output = generateEnvTs(config)
    expect(output).toContain('VITE_API_URL: import.meta.env.VITE_API_URL')
  })

  it('includes the adapter field', () => {
    const config: InitConfig = {
      adapter: 'nextjs',
      server: [],
      client: [],
    }
    const output = generateEnvTs(config)
    expect(output).toContain("adapter: 'nextjs'")
  })

  it('generates empty server and client blocks when both are empty', () => {
    const config: InitConfig = { adapter: 'node', server: [], client: [] }
    const output = generateEnvTs(config)
    expect(output).toContain('server: {')
    expect(output).toContain('client: {')
    expect(output).toContain('runtimeEnv: {')
  })

  it('generates NEXT_PUBLIC_ client vars with process.env source', () => {
    const config: InitConfig = {
      adapter: 'nextjs',
      server: [],
      client: [{ name: 'NEXT_PUBLIC_APP_NAME', type: 'str', optional: false, default: 'My App' }],
    }
    const output = generateEnvTs(config)
    expect(output).toContain("NEXT_PUBLIC_APP_NAME: str().default('My App')")
    expect(output).toContain('NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME')
  })
})

// ---------------------------------------------------------------------------
// generateEnvExample
// ---------------------------------------------------------------------------

describe('generateEnvExample', () => {
  it('generates a server-side section header', () => {
    const config: InitConfig = {
      adapter: 'node',
      server: [{ name: 'DATABASE_URL', type: 'url', optional: false }],
      client: [],
    }
    const output = generateEnvExample(config)
    expect(output).toContain('# ---- Server-side variables ----')
  })

  it('generates a client-side section header when client vars exist', () => {
    const config: InitConfig = {
      adapter: 'nextjs',
      server: [],
      client: [{ name: 'NEXT_PUBLIC_APP', type: 'str', optional: false }],
    }
    const output = generateEnvExample(config)
    expect(output).toContain('# ---- Client-side variables ----')
  })

  it('marks required vars in comment', () => {
    const config: InitConfig = {
      adapter: 'node',
      server: [{ name: 'SECRET', type: 'str', optional: false }],
      client: [],
    }
    const output = generateEnvExample(config)
    expect(output).toContain('# SECRET — required string')
  })

  it('marks optional vars in comment', () => {
    const config: InitConfig = {
      adapter: 'node',
      server: [{ name: 'REDIS_URL', type: 'url', optional: true }],
      client: [],
    }
    const output = generateEnvExample(config)
    expect(output).toContain('# REDIS_URL — optional valid URL')
  })

  it('includes the default value in comment', () => {
    const config: InitConfig = {
      adapter: 'node',
      server: [{ name: 'PORT', type: 'port', optional: false, default: 3000 }],
      client: [],
    }
    const output = generateEnvExample(config)
    expect(output).toContain('# Default: 3000')
  })

  it('prefills the default value in the assignment', () => {
    const config: InitConfig = {
      adapter: 'node',
      server: [{ name: 'PORT', type: 'port', optional: false, default: 3000 }],
      client: [],
    }
    const output = generateEnvExample(config)
    expect(output).toContain('PORT=3000')
  })

  it('leaves the assignment empty when there is no default', () => {
    const config: InitConfig = {
      adapter: 'node',
      server: [{ name: 'DATABASE_URL', type: 'url', optional: false }],
      client: [],
    }
    const output = generateEnvExample(config)
    expect(output).toContain('DATABASE_URL=')
    expect(output).not.toMatch(/DATABASE_URL=\S/)
  })

  it('includes allowed values comment for enum vars', () => {
    const config: InitConfig = {
      adapter: 'node',
      server: [
        {
          name: 'NODE_ENV',
          type: 'str',
          optional: false,
          enum: ['development', 'production', 'test'],
        },
      ],
      client: [],
    }
    const output = generateEnvExample(config)
    expect(output).toContain('# Allowed values: development | production | test')
  })

  it('produces no sections when both server and client are empty', () => {
    const config: InitConfig = { adapter: 'node', server: [], client: [] }
    const output = generateEnvExample(config)
    expect(output).toBe('')
  })

  it('includes min/max constraints in comment', () => {
    const config: InitConfig = {
      adapter: 'node',
      server: [{ name: 'JWT_SECRET', type: 'str', optional: false, min: 32, max: 128 }],
      client: [],
    }
    const output = generateEnvExample(config)
    expect(output).toContain('# Min: 32')
    expect(output).toContain('# Max: 128')
  })
})
