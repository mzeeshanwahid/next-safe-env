import { describe, it, expect, vi, beforeEach } from 'vitest'

// vi.mock is hoisted — must be before any import that uses 'fs'
vi.mock('fs', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  mkdirSync: vi.fn(),
}))

import { detectAdapter, defaultOutputPath } from '../src/cli/init.js'
import { existsSync, readFileSync } from 'fs'

// ---------------------------------------------------------------------------
// detectAdapter
// ---------------------------------------------------------------------------

describe('detectAdapter', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('returns nextjs when next is in dependencies', () => {
    vi.mocked(existsSync).mockReturnValue(true)
    vi.mocked(readFileSync).mockReturnValue(
      JSON.stringify({ dependencies: { next: '14.0.0' } }) as unknown as Buffer,
    )
    expect(detectAdapter()).toBe('nextjs')
  })

  it('returns nextjs when next is in devDependencies', () => {
    vi.mocked(existsSync).mockReturnValue(true)
    vi.mocked(readFileSync).mockReturnValue(
      JSON.stringify({ devDependencies: { next: '14.0.0' } }) as unknown as Buffer,
    )
    expect(detectAdapter()).toBe('nextjs')
  })

  it('returns vite when vite is in devDependencies', () => {
    vi.mocked(existsSync).mockReturnValue(true)
    vi.mocked(readFileSync).mockReturnValue(
      JSON.stringify({ devDependencies: { vite: '^5.0.0' } }) as unknown as Buffer,
    )
    expect(detectAdapter()).toBe('vite')
  })

  it('returns edge for @cloudflare/workers-types', () => {
    vi.mocked(existsSync).mockReturnValue(true)
    vi.mocked(readFileSync).mockReturnValue(
      JSON.stringify({ devDependencies: { '@cloudflare/workers-types': '^4.0.0' } }) as unknown as Buffer,
    )
    expect(detectAdapter()).toBe('edge')
  })

  it('returns edge for @vercel/edge-runtime', () => {
    vi.mocked(existsSync).mockReturnValue(true)
    vi.mocked(readFileSync).mockReturnValue(
      JSON.stringify({ dependencies: { '@vercel/edge-runtime': '^2.0.0' } }) as unknown as Buffer,
    )
    expect(detectAdapter()).toBe('edge')
  })

  it('returns edge for miniflare', () => {
    vi.mocked(existsSync).mockReturnValue(true)
    vi.mocked(readFileSync).mockReturnValue(
      JSON.stringify({ devDependencies: { miniflare: '^3.0.0' } }) as unknown as Buffer,
    )
    expect(detectAdapter()).toBe('edge')
  })

  it('returns node when no known framework is present', () => {
    vi.mocked(existsSync).mockReturnValue(true)
    vi.mocked(readFileSync).mockReturnValue(
      JSON.stringify({ dependencies: { express: '^4.0.0' } }) as unknown as Buffer,
    )
    expect(detectAdapter()).toBe('node')
  })

  it('returns node when dependencies are empty', () => {
    vi.mocked(existsSync).mockReturnValue(true)
    vi.mocked(readFileSync).mockReturnValue(
      JSON.stringify({}) as unknown as Buffer,
    )
    expect(detectAdapter()).toBe('node')
  })

  it('returns null when package.json does not exist', () => {
    vi.mocked(existsSync).mockReturnValue(false)
    expect(detectAdapter()).toBeNull()
  })

  it('returns null when package.json is malformed JSON', () => {
    vi.mocked(existsSync).mockReturnValue(true)
    vi.mocked(readFileSync).mockReturnValue('not-json' as unknown as Buffer)
    expect(detectAdapter()).toBeNull()
  })

  it('prefers nextjs over vite when both are present', () => {
    vi.mocked(existsSync).mockReturnValue(true)
    vi.mocked(readFileSync).mockReturnValue(
      JSON.stringify({ dependencies: { next: '14.0.0' }, devDependencies: { vite: '^5.0.0' } }) as unknown as Buffer,
    )
    expect(detectAdapter()).toBe('nextjs')
  })
})

// ---------------------------------------------------------------------------
// defaultOutputPath
// ---------------------------------------------------------------------------

describe('defaultOutputPath', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('returns src/env.ts for vite', () => {
    expect(defaultOutputPath('vite')).toBe('src/env.ts')
  })

  it('returns src/env.ts for node', () => {
    expect(defaultOutputPath('node')).toBe('src/env.ts')
  })

  it('returns src/env.ts for edge', () => {
    expect(defaultOutputPath('edge')).toBe('src/env.ts')
  })

  it('returns app/env.ts for nextjs when src/app does not exist', () => {
    vi.mocked(existsSync).mockReturnValue(false)
    expect(defaultOutputPath('nextjs')).toBe('app/env.ts')
  })

  it('returns src/app/env.ts for nextjs when src/app exists', () => {
    vi.mocked(existsSync).mockReturnValue(true)
    expect(defaultOutputPath('nextjs')).toBe('src/app/env.ts')
  })
})
