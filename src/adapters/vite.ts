import type { Adapter, Schema } from '../types.js'

/**
 * Adapter for Vite-based React apps (non-Next.js).
 *
 * beforeValidate: enforces that every key in the client schema is prefixed with
 * VITE_ — Vite only exposes VITE_ variables to the client bundle.
 *
 * afterValidate: when running in a browser context (typeof window !== 'undefined'),
 * strips server-only vars as a runtime safety net on top of TypeScript enforcement.
 */
export const viteAdapter: Adapter = {
  name: 'vite',

  beforeValidate(_serverSchema: Schema, clientSchema: Schema, rawEnv) {
    for (const key of Object.keys(clientSchema)) {
      if (!key.startsWith('VITE_')) {
        throw new Error(
          `[next-safe-env] Vite adapter: client key "${key}" must be prefixed with VITE_. ` +
            `Vite only exposes VITE_ variables to the client bundle.`,
        )
      }
    }
    return rawEnv
  },

  afterValidate(env) {
    if ('window' in globalThis) {
      const clientEnv: Record<string, unknown> = {}
      for (const [key, val] of Object.entries(env)) {
        if (key.startsWith('VITE_')) {
          clientEnv[key] = val
        }
      }
      return clientEnv as typeof env
    }
    return env
  },
}
