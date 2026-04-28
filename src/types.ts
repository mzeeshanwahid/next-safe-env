// ---- Server-only type brand ----

declare const SERVER_ONLY_BRAND: unique symbol

/**
 * Marks a value as server-only. Server schema vars carry this brand in the
 * returned env object so IDE tooltips make their origin visible.
 * For a hard compile error when a client component imports server vars, add
 * `import 'server-only'` at the top of your env.ts file.
 */
export type ServerOnly<T> = T & { readonly [SERVER_ONLY_BRAND]: void }

// ---- Primitive building block ----

/**
 * Every schema field is a FieldValidator. The generic T is the TypeScript type
 * that parse() returns — string, number, boolean, or their | undefined variants.
 * _type is a phantom: it never exists at runtime, only in the type system for
 * inference via InferSchema.
 */
export interface FieldValidator<T = unknown> {
  readonly isOptional: boolean
  readonly defaultValue: T | undefined
  // phantom — satisfies the interface but never assigned at runtime (use `declare`)
  _type: T
  parse(rawValue: unknown, fieldName: string): T
}

export type Schema = Record<string, FieldValidator<unknown>>

// ---- Error shapes ----

export type ValidationFailure = {
  field: string
  expected: string
  received: string
  message: string
}

export type ValidationStats = {
  serverTotal: number
  clientTotal: number
  serverFailed: number
  clientFailed: number
}

// Structural type used in EnvConfig.onValidationError — avoids a circular import
// with errors.ts. EnvValidationError satisfies this shape.
export type ValidationErrorShape = {
  readonly failures: ValidationFailure[]
  readonly stats: ValidationStats
  format(): string
  toJSON(): unknown
  message: string
}

// ---- Inference utilities ----

/** Map a Schema to the object type its validators produce. */
export type InferSchema<T extends Schema> = {
  [K in keyof T]: T[K] extends FieldValidator<infer V> ? V : never
}

/** The fully-typed frozen object returned by createEnv(). Server vars carry the ServerOnly<T> brand. */
export type InferEnv<TServer extends Schema, TClient extends Schema> =
  Readonly<
    { [K in keyof TServer]: TServer[K] extends FieldValidator<infer V> ? ServerOnly<V> : never } &
    InferSchema<TClient>
  >

// ---- Adapter ----

export type Adapter = {
  name: string
  /**
   * Called before validation. Receives the server and client schemas separately
   * so adapters can enforce rules like the NEXT_PUBLIC_ prefix on client keys.
   * Returns the (possibly filtered) raw env to validate against.
   */
  beforeValidate(
    serverSchema: Schema,
    clientSchema: Schema,
    rawEnv: Record<string, string | undefined>,
  ): Record<string, string | undefined>
  /**
   * Called after successful validation. Can restrict the returned object
   * (e.g. strip server vars in browser context). Must return the same shape.
   */
  afterValidate<T extends Record<string, unknown>>(env: T): T
}

// ---- Public config ----

export type EnvConfig<
  TServer extends Schema,
  TClient extends Schema,
> = {
  server: TServer
  client: TClient
  /**
   * Explicitly map each schema key to its runtime value. Pass individual
   * `process.env.VAR` references — not the whole `process.env` object — so
   * bundlers can inline each value statically and server vars are never
   * included in the client bundle.
   *
   * @example
   * runtimeEnv: {
   *   DATABASE_URL:        process.env.DATABASE_URL,
   *   NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
   * }
   */
  runtimeEnv: { [K in keyof TServer | keyof TClient]?: string | undefined }
  /** Adapter to use. Auto-detected from the runtime environment when omitted. */
  adapter?: 'nextjs' | 'node' | 'edge'
  /** Pass true in test environments to skip validation entirely. */
  skipValidation?: boolean
  /**
   * Custom error handler. Called instead of console.error + process.exit(1)
   * when validation fails. Must never return — throw or exit inside it.
   */
  onValidationError?: (error: ValidationErrorShape) => never
}
