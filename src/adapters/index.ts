import type { Adapter } from '../types.js'
import { nextjsAdapter } from './nextjs.js'
import { nodeAdapter } from './node.js'
import { edgeAdapter } from './edge.js'
import { viteAdapter } from './vite.js'

const ADAPTERS: Record<string, Adapter> = {
  nextjs: nextjsAdapter,
  node: nodeAdapter,
  edge: edgeAdapter,
  vite: viteAdapter,
}

/**
 * Selects the adapter to use. When name is provided it is used directly;
 * otherwise the runtime environment is probed:
 *   - No process / no process.version → Edge Runtime → edgeAdapter
 *   - NEXT_RUNTIME is set in process.env → Next.js App Router → nextjsAdapter
 *   - Client schema has NEXT_PUBLIC_ keys → likely Next.js Pages Router → nextjsAdapter (+ warning)
 *   - Client schema has VITE_ keys → likely Vite app → viteAdapter (+ warning)
 *   - Otherwise → plain Node.js → nodeAdapter
 */
export function resolveAdapter(
  name: string | undefined,
  clientSchemaKeys: string[],
): Adapter {
  if (name !== undefined) {
    const adapter = ADAPTERS[name]
    if (adapter === undefined) {
      throw new Error(
        `[next-safe-env] Unknown adapter: "${name}". Valid options: nextjs, node, edge, vite`,
      )
    }
    return adapter
  }

  if (typeof process === 'undefined' || !process.version) {
    return edgeAdapter
  }

  // App Router sets NEXT_RUNTIME on the server; read directly from process.env
  // because NEXT_RUNTIME is an internal Next.js var, not part of the user schema.
  if (process.env['NEXT_RUNTIME'] !== undefined) {
    return nextjsAdapter
  }

  // Pages Router does not set NEXT_RUNTIME. Detect it via NEXT_PUBLIC_ client keys
  // so the user gets proper enforcement without needing to pass adapter: 'nextjs'.
  if (clientSchemaKeys.some((k) => k.startsWith('NEXT_PUBLIC_'))) {
    console.warn(
      "[next-safe-env] NEXT_PUBLIC_ client keys detected but NEXT_RUNTIME is not set. " +
        "Defaulting to the nextjs adapter (Next.js Pages Router). " +
        "Pass adapter: 'nextjs' explicitly to suppress this warning.",
    )
    return nextjsAdapter
  }

  // Detect Vite via VITE_ client keys
  if (clientSchemaKeys.some((k) => k.startsWith('VITE_'))) {
    console.warn(
      "[next-safe-env] VITE_ client keys detected. " +
        "Defaulting to the vite adapter. " +
        "Pass adapter: 'vite' explicitly to suppress this warning.",
    )
    return viteAdapter
  }

  return nodeAdapter
}
