import type {
  EnvConfig,
  FieldValidator,
  Schema,
  ValidationFailure,
  InferEnv,
  ZodObjectLike,
} from './types.js'
import { EnvValidationError, FieldError } from './errors.js'
import { resolveAdapter } from './adapters/index.js'

// Runtime detection of duck-typed Zod object schemas
function isZodSchema(
  schema: Schema | ZodObjectLike<Record<string, unknown>>,
): schema is ZodObjectLike<Record<string, unknown>> {
  return (
    typeof schema === 'object' &&
    schema !== null &&
    'safeParse' in schema &&
    typeof (schema as Record<string, unknown>)['safeParse'] === 'function' &&
    'shape' in schema &&
    typeof (schema as Record<string, unknown>)['shape'] === 'object'
  )
}

// Proxy that exposes Zod shape keys as a Schema-compatible record.
// Adapters call Object.keys() on it to enforce prefix rules — the parse()
// implementation is never invoked by adapters.
const STUB_VALIDATOR: FieldValidator<unknown> = {
  isOptional: true,
  defaultValue: undefined,
  _type: undefined as unknown,
  parse: () => undefined,
}

function zodToProxySchema(
  zod: ZodObjectLike<Record<string, unknown>>,
): Schema {
  const proxy: Schema = {}
  for (const key of Object.keys(zod.shape)) {
    proxy[key] = STUB_VALIDATOR
  }
  return proxy
}

function validateZodSchema(
  schema: ZodObjectLike<Record<string, unknown>>,
  processedEnv: Record<string, string | undefined>,
  failures: ValidationFailure[],
  parsed: Record<string, unknown>,
): void {
  // Extract only the keys the schema declares, so Zod strip mode works cleanly
  const input: Record<string, string | undefined> = {}
  for (const key of Object.keys(schema.shape)) {
    input[key] = processedEnv[key]
  }

  const result = schema.safeParse(input)
  if (result.success) {
    Object.assign(parsed, result.data)
  } else {
    for (const issue of result.error.errors) {
      const field = issue.path.length > 0 ? String(issue.path[0]) : 'unknown'
      failures.push({
        field,
        expected: 'valid value',
        received: String(processedEnv[field] ?? 'undefined'),
        message: issue.message,
      })
    }
  }
}

export function createEnv<
  TServer extends Schema | ZodObjectLike<Record<string, unknown>>,
  TClient extends Schema | ZodObjectLike<Record<string, unknown>>,
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

  // Derive client schema keys for adapter auto-detection
  const clientSchemaKeys = isZodSchema(client)
    ? Object.keys(client.shape)
    : Object.keys(client as Schema)

  if (skipValidation) {
    const skipAdapter = resolveAdapter(adapterName, clientSchemaKeys)
    const skipped = skipAdapter.afterValidate(rawEnv as Record<string, unknown>)
    return Object.freeze(skipped) as unknown as InferEnv<TServer, TClient>
  }

  const adapter = resolveAdapter(adapterName, clientSchemaKeys)

  // Adapters receive Schema-compatible proxies so they can call Object.keys()
  // for prefix enforcement regardless of whether native or Zod schemas are used.
  const serverForAdapter = isZodSchema(server)
    ? zodToProxySchema(server)
    : (server as Schema)
  const clientForAdapter = isZodSchema(client)
    ? zodToProxySchema(client)
    : (client as Schema)

  const processedEnv = adapter.beforeValidate(
    serverForAdapter,
    clientForAdapter,
    rawEnv,
  )

  const serverFailures: ValidationFailure[] = []
  const clientFailures: ValidationFailure[] = []
  const parsed: Record<string, unknown> = {}

  if (isZodSchema(server)) {
    validateZodSchema(server, processedEnv, serverFailures, parsed)
  } else {
    for (const [key, validator] of Object.entries(server as Schema)) {
      try {
        parsed[key] = validator.parse(processedEnv[key], key)
      } catch (err) {
        serverFailures.push(toFailure(key, processedEnv[key], err))
      }
    }
  }

  if (isZodSchema(client)) {
    validateZodSchema(client, processedEnv, clientFailures, parsed)
  } else {
    for (const [key, validator] of Object.entries(client as Schema)) {
      try {
        parsed[key] = validator.parse(processedEnv[key], key)
      } catch (err) {
        clientFailures.push(toFailure(key, processedEnv[key], err))
      }
    }
  }

  const allFailures = [...serverFailures, ...clientFailures]

  const serverTotal = isZodSchema(server)
    ? Object.keys(server.shape).length
    : Object.keys(server as Schema).length
  const clientTotal = isZodSchema(client)
    ? Object.keys(client.shape).length
    : Object.keys(client as Schema).length

  if (allFailures.length > 0) {
    const error = new EnvValidationError(allFailures, {
      serverTotal,
      clientTotal,
      serverFailed: serverFailures.length,
      clientFailed: clientFailures.length,
    })

    if (onValidationError) {
      onValidationError(error)
    } else {
      console.error(error.format())
      if (typeof process !== 'undefined') {
        process.exit(1)
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
