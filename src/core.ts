import type { EnvConfig, Schema, ValidationFailure, InferEnv } from './types.js'
import { EnvValidationError, FieldError } from './errors.js'
import { resolveAdapter } from './adapters/index.js'

export function createEnv<
  TServer extends Schema,
  TClient extends Schema,
>(config: EnvConfig<TServer, TClient>): InferEnv<TServer, TClient> {
  const {
    server,
    client,
    runtimeEnv,
    adapter: adapterName,
    skipValidation = false,
    onValidationError,
  } = config

  const rawEnv = runtimeEnv as Record<string, string | undefined>

  if (skipValidation) {
    const skipAdapter = resolveAdapter(adapterName, Object.keys(client))
    const skipped = skipAdapter.afterValidate(rawEnv as Record<string, unknown>)
    return Object.freeze(skipped) as unknown as InferEnv<TServer, TClient>
  }

  const adapter = resolveAdapter(adapterName, Object.keys(client))
  const processedEnv = adapter.beforeValidate(server as Schema, client as Schema, rawEnv)

  const serverFailures: ValidationFailure[] = []
  const clientFailures: ValidationFailure[] = []
  const parsed: Record<string, unknown> = {}

  for (const [key, validator] of Object.entries(server)) {
    try {
      parsed[key] = validator.parse(processedEnv[key], key)
    } catch (err) {
      serverFailures.push(toFailure(key, processedEnv[key], err))
    }
  }

  for (const [key, validator] of Object.entries(client)) {
    try {
      parsed[key] = validator.parse(processedEnv[key], key)
    } catch (err) {
      clientFailures.push(toFailure(key, processedEnv[key], err))
    }
  }

  const allFailures = [...serverFailures, ...clientFailures]

  if (allFailures.length > 0) {
    const error = new EnvValidationError(allFailures, {
      serverTotal: Object.keys(server).length,
      clientTotal: Object.keys(client).length,
      serverFailed: serverFailures.length,
      clientFailed: clientFailures.length,
    })

    if (onValidationError) {
      onValidationError(error)
    } else {
      console.error(error.format())
      const proc = (globalThis as { process?: { exit?: (code: number) => never } }).process
      if (typeof proc?.exit === 'function') {
        proc.exit(1)
      } else {
        throw error
      }
    }
  }

  const result = adapter.afterValidate(parsed)
  return Object.freeze(result) as InferEnv<TServer, TClient>
}

function toFailure(
  field: string,
  rawValue: string | undefined,
  err: unknown,
): ValidationFailure {
  if (err instanceof FieldError) {
    return err.toFailure()
  }
  return {
    field,
    expected: 'valid value',
    received: rawValue ?? 'undefined',
    message: err instanceof Error ? err.message : String(err),
  }
}
