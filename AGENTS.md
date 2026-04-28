# next-safe-env — Agent & Project Reference

This document is for coding agents and internal use. It covers project context, design decisions, and the complete public API with exact type signatures.

---

## What this package is

`next-safe-env` is a lightweight, zero-dependency npm package that validates and types environment variables for Next.js, Node.js, and Edge Runtime applications. It crashes loudly at startup if your environment is misconfigured — never at runtime. It exposes a single `createEnv()` function that reads from `process.env`, validates every field against a schema you define, and returns a fully TypeScript-inferred, frozen object.

The package fixes the universal pain point that `process.env.X` is always `string | undefined` in TypeScript — no autocomplete, no validation, and silent runtime failures instead of startup errors.

### Why existing solutions fall short

- **`t3-env`** — closest existing solution. Requires Zod as a peer dep, no first-class Edge Runtime adapter, poor ergonomics for teams not already on Zod.
- **`dotenv`** — only loads `.env` files into `process.env`. No validation, no types, no schema.
- **`envalid`** — validates env vars but has no Next.js adapter, no client/server split, and predates modern TypeScript inference.
- **`zod` + manual wiring** — works, but requires 50+ lines of boilerplate and introduces Zod as a hard runtime dependency.

---

## Target users

- Next.js developers using the App Router (Next.js 13+)
- Node.js developers building APIs or CLIs
- Teams deploying to Vercel, Railway, Fly.io, or any platform with environment variable configuration
- Developers who want TypeScript-safe env access without adding Zod as a dependency

---

## Core design principles

### 1. Fail at startup, never at runtime
`createEnv()` is called at module load time. Validation runs synchronously before the app serves a single request. If any variable fails validation, the process exits with a non-zero code and a clear, human-readable error message listing every problem.

### 2. Server/client split is explicit and enforced
The schema has two top-level keys: `server` and `client`. Server vars are never available in client bundles — enforced both by TypeScript (branded types cause compile errors) and at runtime by the adapter layer. Client vars must be prefixed `NEXT_PUBLIC_` in Next.js mode; the package validates this automatically.

### 3. Zero runtime dependencies
The package ships with no `dependencies` in `package.json`. All validation logic is self-contained. This keeps install size minimal and eliminates peer-dep conflicts.

### 4. Fluent, chainable validator API
Validators are built using a fluent builder pattern that mirrors how developers think about constraints:

```ts
str().url()
num().port().default(3000)
bool().optional()
str().enum(['development', 'production', 'test'])
```

### 5. TypeScript inference is the output, not documentation
The return type of `createEnv()` is fully inferred. You never write a separate type for your env object. When you add a new field to the schema, it automatically appears with the correct type in every file that imports `env`.

### 6. Adapters handle runtime context differences
The package ships three adapters:
- `nextjs` — enforces `NEXT_PUBLIC_` prefix rules and guards against client-bundle leakage
- `node` — for plain Node.js servers, CLIs, scripts
- `edge` — for Vercel Edge Runtime / Next.js Middleware; strips server-only vars from the returned object

---

## What the package does NOT do

- Does not load `.env` files — use `dotenv` or Next.js built-in loading; this package validates what's already in `process.env`
- Does not support async validation
- Does not depend on Zod (a Zod interop adapter is planned for Phase 2)
- Does not handle secret rotation or runtime secret injection
- Does not generate `.env.example` files (planned for Phase 3 CLI)

---

## Competitive positioning

| Feature | next-safe-env | t3-env | envalid | dotenv + Zod |
|---|---|---|---|---|
| Zero dependencies | ✅ | ❌ (requires Zod) | ❌ | ❌ |
| Next.js App Router support | ✅ | Partial | ❌ | ❌ |
| Server/client TypeScript split | ✅ | ✅ | ❌ | Manual |
| Edge Runtime adapter | ✅ | ❌ | ❌ | ❌ |
| Fluent validator API | ✅ | Zod-based | Custom | Zod-based |
| Pretty error output | ✅ | Partial | ✅ | Manual |
| Bundle size | < 5 kB | ~50 kB+ (with Zod) | ~10 kB | ~50 kB+ |
| Auto-enforce `NEXT_PUBLIC_` prefix | ✅ | Manual | ❌ | ❌ |

---

## Package identity

| Field | Value |
|---|---|
| Package name | `next-safe-env` |
| Version | 0.1.0 |
| Language | TypeScript (compiled to CJS + ESM dual output) |
| Runtime targets | Node.js 18+, Edge Runtime (Web API subset) |
| Framework targets | Next.js 13+ (App Router), plain Node.js |
| Dependencies | None |
| Dev dependencies | TypeScript, Vitest, tsup, ESLint, Prettier |
| Bundle size target | < 5 kB gzipped |
| License | MIT |
| Module format | Dual: ESM (`import`) + CJS (`require`) via tsup |

---

## Development environment

```
Node.js:     18+
TypeScript:  5.x
Build tool:  tsup (produces ESM + CJS + .d.ts)
Test runner: Vitest
Linter:      ESLint + @typescript-eslint
Formatter:   Prettier
CI:          GitHub Actions
```

---

## Public exports

```ts
// Core
createEnv(config: EnvConfig<TServer, TClient>): InferEnv<TServer, TClient>

// Validator factories
str():  StringValidator<string>
num():  NumberValidator<number>
bool(): BooleanValidator<boolean>
url():  StringValidator<string>   // shorthand: str().url()
port(): NumberValidator<number>   // shorthand: num().port()

// Error class
EnvValidationError

// Types (all re-exported)
EnvConfig, InferEnv, InferSchema, ServerOnly,
Adapter, FieldValidator, Schema,
ValidationFailure, ValidationStats
```

---

## `createEnv()` — full config shape

```ts
createEnv({
  // Server-only vars. Values carry the ServerOnly<T> brand in the returned object.
  server: {
    DATABASE_URL: url(),
    JWT_SECRET:   str().min(32),
    PORT:         port().default(3000),
    NODE_ENV:     str().enum(['development', 'production', 'test']),
    REDIS_URL:    url().optional(),
  },

  // Client-safe vars. Must use NEXT_PUBLIC_ prefix when adapter is 'nextjs'.
  client: {
    NEXT_PUBLIC_API_URL:  url(),
    NEXT_PUBLIC_APP_NAME: str().default('My App'),
  },

  // REQUIRED: map every key from server + client to its runtime value.
  // Pass individual process.env.VAR references — NOT the whole process.env object.
  // Bundlers (Next.js, Vite) inline each reference statically; passing the whole
  // object prevents tree-shaking and leaks server vars into the client bundle.
  runtimeEnv: {
    DATABASE_URL:         process.env.DATABASE_URL,
    JWT_SECRET:           process.env.JWT_SECRET,
    PORT:                 process.env.PORT,
    NODE_ENV:             process.env.NODE_ENV,
    REDIS_URL:            process.env.REDIS_URL,
    NEXT_PUBLIC_API_URL:  process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
  },

  // OPTIONAL: 'nextjs' | 'node' | 'edge'. Auto-detected when omitted (see Adapters).
  adapter: 'nextjs',

  // OPTIONAL: skip validation entirely. Use in test environments.
  // When true, raw runtimeEnv values are returned after adapter.afterValidate().
  skipValidation: process.env.NODE_ENV === 'test',

  // OPTIONAL: custom error handler. Must never return — throw or exit inside it.
  // Default behavior: console.error(err.format()) + process.exit(1).
  onValidationError: (err) => {
    myLogger.fatal(err.toJSON())
    process.exit(1)
  },
})
```

---

## Return type

```ts
// Server vars → ServerOnly<T> (T branded with a unique symbol)
// Client vars → T (plain inferred type)
// The whole object is Readonly<...> and Object.freeze()'d at runtime.

type InferEnv<TServer, TClient> = Readonly<
  { [K in keyof TServer]: ServerOnly<InferredType> } &
  { [K in keyof TClient]: InferredType }
>
```

`ServerOnly<T>` is `T & { readonly [SERVER_ONLY_BRAND]: void }`. It is assignment-compatible with `T` at the TypeScript level (structural typing), so it will NOT produce a compile error by itself. To get a hard compile error when a client component reads a server var, add `import 'server-only'` at the top of the file that calls `createEnv()`.

---

## Validators

All validators are chainable. Every chain method returns `this` (except `optional()`, `default()`, and `enum()` which narrow the return type).

### `str()` — StringValidator

```ts
str()
  .url()              // must parse as a valid URL (uses `new URL(val)`)
  .min(n: number)     // val.length >= n
  .max(n: number)     // val.length <= n
  .regex(r: RegExp)   // r.test(val) must be true
  .enum(values: E[])  // val must be one of values; narrows type to literal union E
  .optional()         // allows undefined → type becomes string | undefined
  .default(v: string) // fallback when var is missing → type stays string

// Type effect examples:
str()                              // StringValidator<string>
str().optional()                   // StringValidator<string | undefined>
str().default('x')                 // StringValidator<string>
str().enum(['a', 'b'])             // StringValidator<'a' | 'b'>
str().optional().enum(['a', 'b'])  // StringValidator<'a' | 'b' | undefined>
```

`str()` always reads the raw string as-is. No coercion.

### `num()` — NumberValidator

```ts
num()
  .port()             // shorthand: .int().min(1).max(65535)
  .int()              // Number.isInteger(val) must be true
  .min(n: number)     // val >= n
  .max(n: number)     // val <= n
  .optional()         // type becomes number | undefined
  .default(v: number) // type stays number
```

Coercion: `Number(rawValue)`. If `NaN`, validation fails immediately before any chained rules run.

### `bool()` — BooleanValidator

```ts
bool()
  .optional()          // type becomes boolean | undefined
  .default(v: boolean) // type stays boolean
```

Coercion: case-insensitive string match.
- `true`  ← `"true"`, `"1"`, `"yes"`, `"on"`
- `false` ← `"false"`, `"0"`, `"no"`, `"off"`

Any other value fails validation.

### Shorthands

```ts
url()   // str().url()  — same type: StringValidator<string>
port()  // num().port() — same type: NumberValidator<number>
```

---

## Adapters

Adapters wrap the validation pipeline with two hooks:
- `beforeValidate(serverSchema, clientSchema, rawEnv)` — runs before any field is validated; can inspect schema keys or throw early.
- `afterValidate(env)` — runs after all fields pass; can strip keys from the result.

### Auto-detection order (when `adapter` is omitted)

| Condition | Adapter selected |
|---|---|
| `typeof process === 'undefined'` or `!process.version` | `edge` |
| `process.env.NEXT_RUNTIME !== undefined` | `nextjs` (App Router sets this) |
| Any client schema key starts with `NEXT_PUBLIC_` | `nextjs` + `console.warn` (Pages Router heuristic) |
| Otherwise | `node` |

Pass `adapter` explicitly to suppress the Pages Router warning.

---

### `node` adapter

**Use for:** Express, Fastify, CLI scripts, plain Node.js apps.

Both hooks are no-ops. Raw env goes in; validated env comes out unchanged. All vars from both schemas are available in the result.

---

### `nextjs` adapter

**Use for:** Next.js App Router and Pages Router.

**`beforeValidate`** — iterates `clientSchema` keys and **throws** if any key does not start with `NEXT_PUBLIC_`. Next.js silently omits client vars without this prefix in the browser bundle, so this is a hard fail-fast.

```
Error: [next-safe-env] Client env var "API_KEY" must be prefixed with NEXT_PUBLIC_.
```

**`afterValidate`** — if `typeof window !== 'undefined'` (browser context), strips every non-`NEXT_PUBLIC_` key from the result before returning. This is a runtime safety net; TypeScript types are the primary enforcement layer.

Server-side (Node.js context): all vars are returned unchanged.

---

### `edge` adapter

**Use for:** Vercel Edge Runtime, Next.js Middleware (`middleware.ts`).

The Edge Runtime is neither a full Node.js process nor a browser. It only exposes `NEXT_PUBLIC_` vars at runtime.

**`beforeValidate`** — does NOT block validation, but emits `console.warn` if the server schema contains any keys:

```
[next-safe-env] Edge adapter: server vars (API_SIGNING_KEY) will be validated
but stripped from the result — they are not accessible in Edge Runtime.
```

Server vars are still validated (so a missing or malformed var still fails), but they will not appear in the returned object.

**`afterValidate`** — **unconditionally** strips every key that does not start with `NEXT_PUBLIC_`. The strip always happens regardless of `typeof window` because there is no `window` in Edge Runtime.

**Key difference from `nextjs` adapter:**
- `nextjs`: strips server vars **only in browser context** (`typeof window !== 'undefined'`)
- `edge`: strips server vars **always**, unconditionally

---

## Error handling

### Default behavior

```
[next-safe-env] Environment validation failed — 3 error(s):

  ✗ DATABASE_URL     — Expected valid URL. Got: "postgres-localhost"
  ✗ JWT_SECRET       — Expected length >= 32. Got: "length 12"
  ✗ SMTP_PORT        — Expected <= 65535. Got: "99999"

  Server vars:  2 valid, 3 invalid
  Client vars:  2 valid, 0 invalid

  Set the correct values in your .env file or deployment environment and restart.
```

All failures are collected before exiting — never short-circuits on the first.

### `EnvValidationError`

```ts
class EnvValidationError extends Error {
  readonly failures: ValidationFailure[]  // array of { field, expected, received, message }
  readonly stats: ValidationStats         // { serverTotal, clientTotal, serverFailed, clientFailed }

  format(): string    // the pretty-printed multi-line string shown above
  toJSON(): unknown   // { error: 'EnvValidationError', failures, stats }
}
```

`onValidationError` receives an `EnvValidationError` instance. It must never return — call `process.exit()` or throw inside it.

---

## Complete usage patterns

### Next.js App Router — `src/env.ts`

```ts
import { createEnv, str, num, bool, url, port } from 'next-safe-env'

export const env = createEnv({
  server: {
    DATABASE_URL: url(),
    JWT_SECRET:   str().min(32),
    SMTP_PORT:    port().default(587),
    NODE_ENV:     str().enum(['development', 'production', 'test']),
    REDIS_URL:    url().optional(),
  },
  client: {
    NEXT_PUBLIC_API_URL:      url(),
    NEXT_PUBLIC_APP_NAME:     str().default('My App'),
    NEXT_PUBLIC_ENABLE_DEBUG: bool().default(false),
  },
  runtimeEnv: {
    DATABASE_URL:             process.env.DATABASE_URL,
    JWT_SECRET:               process.env.JWT_SECRET,
    SMTP_PORT:                process.env.SMTP_PORT,
    NODE_ENV:                 process.env.NODE_ENV,
    REDIS_URL:                process.env.REDIS_URL,
    NEXT_PUBLIC_API_URL:      process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_APP_NAME:     process.env.NEXT_PUBLIC_APP_NAME,
    NEXT_PUBLIC_ENABLE_DEBUG: process.env.NEXT_PUBLIC_ENABLE_DEBUG,
  },
  adapter: 'nextjs',
})
```

### Next.js Edge Middleware — `middleware.ts`

```ts
import { createEnv, str, url } from 'next-safe-env'

export const env = createEnv({
  server: {},  // prefer empty — server vars are stripped anyway
  client: {
    NEXT_PUBLIC_API_URL:  url(),
    NEXT_PUBLIC_APP_NAME: str().default('My App'),
  },
  runtimeEnv: {
    NEXT_PUBLIC_API_URL:  process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
  },
  adapter: 'edge',
})
```

### Plain Node.js — `config/env.ts`

```ts
import { createEnv, str, num, bool, url, port } from 'next-safe-env'

export const env = createEnv({
  server: {
    DATABASE_URL: url(),
    PORT:         port().default(3000),
    LOG_LEVEL:    str().enum(['debug', 'info', 'warn', 'error']).default('info'),
    ENABLE_CACHE: bool().default(true),
  },
  client: {},
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    PORT:         process.env.PORT,
    LOG_LEVEL:    process.env.LOG_LEVEL,
    ENABLE_CACHE: process.env.ENABLE_CACHE,
  },
  adapter: 'node',
})
```

### Test environments — skip validation

```ts
export const env = createEnv({
  server: { DATABASE_URL: url() },
  client: {},
  runtimeEnv: { DATABASE_URL: process.env.DATABASE_URL },
  skipValidation: process.env.NODE_ENV === 'test',
})
```

When `skipValidation` is `true`, `beforeValidate` and field-level validation are skipped entirely. `afterValidate` still runs (adapter key-stripping applies). Raw string values are returned in the typed shape.

---

## Rules and constraints

1. **`runtimeEnv` must list every key** present in `server` and `client`. A key in the schema but absent from `runtimeEnv` will be `undefined` at validation time. Do not spread `process.env` — pass individual `process.env.VAR` references.

2. **`client` keys must be `NEXT_PUBLIC_`-prefixed** when using the `nextjs` adapter. The adapter throws synchronously in `beforeValidate` if this rule is violated.

3. **The returned object is frozen** (`Object.freeze`). Mutation at runtime will silently fail in non-strict mode and throw in strict mode.

4. **`optional()` and `default()` are mutually exclusive in intent.** `default` implies the value is always present; `optional` implies it may be absent. Using both is valid — `default` takes priority if the var is missing.

5. **`onValidationError` must never return.** The engine does not call `process.exit` after invoking it. If the handler returns, execution continues with an invalid env object.

6. **`bool()` coercion is strict.** Only the eight literal strings listed above are accepted. The comparison is case-insensitive after `.toLowerCase()`, so `"TRUE"` → `"true"` → valid.

7. **`num()` coercion uses `Number()`**, not `parseInt`. `"3.14"` becomes `3.14`. Use `.int()` to reject non-integers.

---

## TypeScript inference reference

```ts
// Given:
const env = createEnv({
  server: { DB: url(), PORT: port().default(5432) },
  client: { NEXT_PUBLIC_KEY: str().optional() },
  runtimeEnv: { ... },
})

// Inferred type:
// {
//   readonly DB:              ServerOnly<string>
//   readonly PORT:            ServerOnly<number>
//   readonly NEXT_PUBLIC_KEY: string | undefined
// }
```

Use `InferEnv<typeof serverSchema, typeof clientSchema>` to derive the env type from the schema objects if you need to pass the type elsewhere.

---

## Future roadmap

See `architecture.md` for detailed phase plans. Summary:

### Phase 2 — Ecosystem
- Zod interop: `createEnv({ server: z.object({...}), client: z.object({...}) })`
- Server-only branding via nominal TypeScript types (compile error in client components)
- Vite adapter (for non-Next.js React apps using `import.meta.env`)

### Phase 3 — Tooling
- CLI: `npx next-safe-env check` — validate without starting the app
- CLI: `npx next-safe-env init` — scaffold `src/env.ts` interactively
- CLI: `npx next-safe-env generate-example` — write `.env.example` from schema
- Nested schemas: `DATABASE: { URL: url(), POOL_SIZE: num().default(5) }` → `env.DATABASE.URL`
