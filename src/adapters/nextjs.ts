import type { Adapter, Schema } from '../types.js'

/**
 * Adapter for Next.js App Router projects.
 *
 * beforeValidate: enforces that every key in the client schema is prefixed with
 * NEXT_PUBLIC_ — Next.js will silently omit any client var that lacks this prefix,
 * making it undefined in the browser.
 *
 * afterValidate: when running in a browser context (typeof window !== 'undefined'),
 * strips server-only vars as a runtime safety net. TypeScript is the primary
 * enforcement mechanism; this is the defense-in-depth layer.
 */
export const nextjsAdapter: Adapter = {
  name: 'nextjs',

  beforeValidate(_serverSchema: Schema, clientSchema: Schema, rawEnv) {
    for (const key of Object.keys(clientSchema)) {
      if (!key.startsWith('NEXT_PUBLIC_')) {
        throw new Error(
          `[next-safe-env] Client env var "${key}" must be prefixed with NEXT_PUBLIC_. ` +
            `Next.js will not expose it to the browser otherwise.`,
        )
      }
    }
    return rawEnv
  },

  afterValidate(env) {
    if ('window' in globalThis) {
      const clientEnv: Record<string, unknown> = {}
      for (const [key, val] of Object.entries(env)) {
        if (key.startsWith('NEXT_PUBLIC_')) {
          clientEnv[key] = val
        }
      }
      return clientEnv as typeof env
    }
    return env
  },
}
