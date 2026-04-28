import type { Adapter, Schema } from '../types.js'

/**
 * Adapter for Vercel Edge Runtime and Next.js Middleware.
 * Server-only vars are unavailable in the Edge Runtime, so afterValidate strips
 * anything that isn't NEXT_PUBLIC_.
 */
export const edgeAdapter: Adapter = {
  name: 'edge',

  beforeValidate(serverSchema: Schema, _clientSchema, rawEnv) {
    const serverKeys = Object.keys(serverSchema)
    if (serverKeys.length > 0) {
      console.warn(
        `[next-safe-env] Edge adapter: server vars (${serverKeys.join(', ')}) will be validated ` +
          `but stripped from the result — they are not accessible in Edge Runtime. ` +
          `Remove them from the server schema, or move public vars to the client schema with a NEXT_PUBLIC_ prefix.`,
      )
    }
    return rawEnv
  },

  afterValidate(env) {
    const edgeEnv: Record<string, unknown> = {}
    for (const [key, val] of Object.entries(env)) {
      if (key.startsWith('NEXT_PUBLIC_')) {
        edgeEnv[key] = val
      }
    }
    return edgeEnv as typeof env
  },
}
