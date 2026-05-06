<div align="center">
  <img src="https://raw.githubusercontent.com/mzeeshanwahid/next-safe-env/main/logo-nobg.png" width="400" alt="next-safe-env logo" />
  <h1>next-safe-env</h1>
  <p>Typed, validated environment variables for Next.js and Node.js. Crash at startup, never at runtime.</p>
</div>

<br/>

<p align="center"><a href="https://www.npmjs.com/package/next-safe-env"><img src="https://img.shields.io/npm/v/next-safe-env?color=0ea5e9&label=npm" alt="npm version" /></a> <a href="https://bundlephobia.com/package/next-safe-env"><img src="https://img.shields.io/bundlephobia/minzip/next-safe-env?color=22c55e&label=gzipped" alt="bundle size" /></a> <a href="./LICENSE"><img src="https://img.shields.io/npm/l/next-safe-env?color=a855f7" alt="license" /></a> <a href="https://github.com/mzeeshanwahid/next-safe-env/actions"><img src="https://img.shields.io/github/actions/workflow/status/mzeeshanwahid/next-safe-env/ci.yml?label=tests" alt="tests" /></a> <a href="./package.json"><img src="https://img.shields.io/badge/dependencies-zero-f97316" alt="zero dependencies" /></a> <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-5.x-3178c6" alt="TypeScript" /></a></p>

---

## The problem

Every Next.js and Node.js project has the same boilerplate:

```ts
const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) throw new Error('Missing DATABASE_URL')

const PORT = parseInt(process.env.PORT ?? '3000', 10)
if (isNaN(PORT)) throw new Error('PORT must be a number')
```

This fails in five compounding ways:

- `process.env.X` is always `string | undefined` -  no types, no autocomplete
- Missing or malformed vars are often found mid-request, not at startup
- Nothing stops you from reading `process.env.DATABASE_URL` in a client component and getting a silent `undefined` in the browser.
- Every project re-writes the same validation logic from scratch
- There's no single place to audit what your app needs to run

`next-safe-env` fixes all of this with a single function call.

---

## Why `next-safe-env`?

| Feature | **next-safe-env** | t3-env | envalid | dotenv + Zod |
|---|:---:|:---:|:---:|:---:|
| Zero dependencies | ✅ | ❌ | ❌ | ❌ |
| Next.js App Router support | ✅ | Partial | ❌ | ❌ |
| Server/client TypeScript split | ✅ | ✅ | ❌ | Manual |
| Edge Runtime adapter | ✅ | ❌ | ❌ | ❌ |
| Fluent validator API | ✅ | Schema-based | Custom | Schema-based |
| Pretty error output | ✅ | Partial | ✅ | Manual |
| Bundle size | **< 5 kB** | ~50 kB+ | ~10 kB | ~50 kB+ |
| Auto-enforce `NEXT_PUBLIC_` prefix | ✅ | Manual | ❌ | ❌ |
| Zod interop | Optional ✅ | Required | ❌ | Required |
| `ClientEnv<T>` server-only branding | ✅ | Partial | ❌ | Manual |
| Vite adapter | ✅ | ✅ | ❌ | Manual |

If your project already uses a schema validation library, tools like `t3-env` or `envalid` integrate well with your existing setup. `next-safe-env` is for teams that want typed, validated env vars with no additional dependencies, the full feature set ships in under 5 kB.

---

## Requirements

- **Node.js** 18+
- **TypeScript** 5.x

No runtime dependencies.

---

## Installation

```bash
npm install next-safe-env
# or
pnpm add next-safe-env
# or
yarn add next-safe-env
```

> **Note:** `next-safe-env` validates what is already in `process.env`. It does not load `.env` files. For that, use Next.js's built-in `.env` support or `dotenv`.

---

## Quick start

```ts
// src/env.ts
import { createEnv, str, url, port, bool } from 'next-safe-env'

export const env = createEnv({
  server: {
    DATABASE_URL: url(),                // must be a valid URL
    PORT:         port().default(3000), // coerced to number, defaults to 3000
    NODE_ENV:     str().enum(['development', 'production', 'test']),
  },
  client: {
    NEXT_PUBLIC_APP_NAME:     str().default('My App'),
    NEXT_PUBLIC_ENABLE_DEBUG: bool().default(false),
  },
  runtimeEnv: {
    DATABASE_URL:             process.env.DATABASE_URL,
    PORT:                     process.env.PORT,
    NODE_ENV:                 process.env.NODE_ENV,
    NEXT_PUBLIC_APP_NAME:     process.env.NEXT_PUBLIC_APP_NAME,
    NEXT_PUBLIC_ENABLE_DEBUG: process.env.NEXT_PUBLIC_ENABLE_DEBUG,
  },
})
```

```ts
// anywhere in your app
import { env } from '@/env'

env.DATABASE_URL          // string
env.PORT                  // number — not string
env.NEXT_PUBLIC_APP_NAME  // string
```

If any variable is missing or invalid, the app refuses to start and prints every problem at once. See [What happens when validation fails](#3-what-happens-when-validation-fails).

---

## Usage - Next.js (App Router)

### 1. Create `src/env.ts`

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
  // Pass individual process.env.VAR references, not the whole process.env object.
  // This lets the bundler inline each value statically, which prevents server
  // vars from being included in the client bundle.
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
})
```

### 2. Use it everywhere

```ts
// app/api/auth/route.ts — server context, all vars available
import { env } from '@/env'

export async function POST() {
  const db   = await connectDB(env.DATABASE_URL)  // string
  const port = env.SMTP_PORT                       // number, not string
  const debug = env.NEXT_PUBLIC_ENABLE_DEBUG       // boolean
}
```

```ts
// app/components/Header.tsx — client component
import { env } from '@/env'

export function Header() {
  // ✅ Client vars are fully typed and autocomplete
  return <h1>{env.NEXT_PUBLIC_APP_NAME}</h1>

  // ⚠️  Server vars carry the ServerOnly<T> brand — visible in IDE tooltips.
  // For a hard compile error that prevents client components from reading
  // server vars, add `import 'server-only'` at the top of your env.ts file.
}
```

### 3. What happens when validation fails

The app refuses to start and logs every problem at once:

```
[next-safe-env] Environment validation failed — 3 error(s):

  ✗ DATABASE_URL     — Required. Expected a valid URL. Got: "postgres-localhost"
  ✗ JWT_SECRET       — Too short. Must be ≥ 32 characters. Got length: 12
  ✗ SMTP_PORT        — Invalid port. Must be 1–65535. Got: "99999"

  Server vars:  2 valid, 3 invalid
  Client vars:  2 valid, 0 invalid

  Set the correct values in your .env file or deployment environment and restart.
```

No more hunting for the first `undefined` at runtime, you see the full list the moment the app starts.

### Next.js adapter rules

- Every key in `client` **must** be prefixed `NEXT_PUBLIC_`. The adapter throws immediately if it isn't Next.js would silently omit it in the browser bundle otherwise.
- Server vars are stripped from the returned object when running in a browser context (defense-in-depth on top of the TypeScript enforcement).
- The adapter is **auto-detected**: if `NEXT_RUNTIME` is set in the environment, `next-safe-env` selects the `nextjs` adapter automatically. You only need `adapter: 'nextjs'` to be explicit.

---

## Usage - Node.js

Works the same way for plain Node.js servers, APIs, and CLI scripts. No Next.js-specific rules apply.

```ts
// config/env.ts
import { createEnv, str, bool, url, port } from 'next-safe-env'

export const env = createEnv({
  server: {
    DATABASE_URL:  url(),
    PORT:          port().default(3000),
    LOG_LEVEL:     str().enum(['debug', 'info', 'warn', 'error']).default('info'),
    ENABLE_CACHE:  bool().default(true),
    REDIS_URL:     url().optional(),
  },
  client: {},
  runtimeEnv: {
    DATABASE_URL:  process.env.DATABASE_URL,
    PORT:          process.env.PORT,
    LOG_LEVEL:     process.env.LOG_LEVEL,
    ENABLE_CACHE:  process.env.ENABLE_CACHE,
    REDIS_URL:     process.env.REDIS_URL,
  },
  adapter: 'node',
})
```

```ts
// server.ts
import { env } from './config/env.js'

app.listen(env.PORT, () => {
  console.log(`Listening on port ${env.PORT}`)  // number, not string
})
```

---

## Usage - Edge Runtime

For Vercel Edge Runtime and Next.js Middleware (`middleware.ts`). The Edge Runtime only exposes `NEXT_PUBLIC_` vars at runtime, server-only secrets are not available.

```ts
// middleware.ts
import { createEnv, str, url } from 'next-safe-env'

export const env = createEnv({
  server: {},  // prefer empty — server vars are validated but stripped from the result
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

The `edge` adapter strips all non-`NEXT_PUBLIC_` vars from the returned object unconditionally, reflecting what is actually available in the Edge Runtime.

---

## All validators

```ts
// String — always reads process.env value as-is
str()
  .url()                           // valid URL (uses the URL constructor)
  .min(n: number)                  // minimum string length
  .max(n: number)                  // maximum string length
  .regex(r: RegExp)                // must match pattern
  .enum(['a', 'b', 'c'])          // must be one of these exact values
  .optional()                      // allows undefined — type becomes string | undefined
  .default('value')                // fallback when var is missing — type stays string

// Number — coerces string → number automatically
num()
  .port()                          // shorthand: integer in range 1–65535
  .int()                           // must be a whole number
  .min(n: number)
  .max(n: number)
  .optional()
  .default(3000)

// Boolean — coerces "true"/"false"/"1"/"0"/"yes"/"no"/"on"/"off" → boolean
bool()
  .optional()
  .default(false)

// Shorthands
url()    // str().url()
port()   // num().port()
```

Validators are chainable and composable:

```ts
str().min(8).max(64).regex(/^[a-z_]+$/)
num().int().min(1).max(100).default(10)
str().enum(['development', 'staging', 'production']).default('development')
```

---

## Config reference

```ts
createEnv({
  server: { ... },          // required — server-only env vars
  client: { ... },          // required — client-safe env vars (must be NEXT_PUBLIC_ in Next.js)
  runtimeEnv: {             // required — one entry per key in server + client
    DATABASE_URL:         process.env.DATABASE_URL,
    NEXT_PUBLIC_API_URL:  process.env.NEXT_PUBLIC_API_URL,
    // ...
  },

  adapter: 'nextjs',        // optional — 'nextjs' | 'node' | 'edge'
                            //            auto-detected from runtime when omitted

  skipValidation: false,    // optional — skip all validation (see Test environments)

  onValidationError: (err) => {   // optional — custom handler instead of console.error + exit(1)
    myLogger.fatal(err.toJSON())  //            must never return
    process.exit(1)
  },
})
```

### Adapter auto-detection

When `adapter` is omitted, `next-safe-env` selects the adapter in this order:

| Condition | Adapter |
|---|---|
| `process` is undefined or has no `version` | `edge` |
| `process.env.NEXT_RUNTIME` is set | `nextjs` |
| Otherwise | `node` |

---

## Test environments

Pass `skipValidation: true` to bypass all field validation in test suites where env vars may be missing by design:

```ts
// src/env.ts
export const env = createEnv({
  server: { DATABASE_URL: url(), JWT_SECRET: str().min(32) },
  client: {},
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    JWT_SECRET:   process.env.JWT_SECRET,
  },
  skipValidation: process.env.NODE_ENV === 'test',
})
```

When `skipValidation` is `true`, the raw values from `runtimeEnv` are returned in the typed shape, no coercion, no checks. Use this only in test environments. Never in production or CI validation steps.

---

## Zod interop

Teams already on Zod can pass a `z.object(...)` schema directly — no need to rewrite validators. `next-safe-env` duck-types the Zod schema at runtime so there is no peer-dependency requirement; Zod is only needed in your own project.

```ts
import { z } from 'zod'
import { createEnv } from 'next-safe-env'

export const env = createEnv({
  server: z.object({
    DATABASE_URL: z.string().url(),
    PORT:         z.coerce.number().int().min(1).max(65535).default(3000),
    NODE_ENV:     z.enum(['development', 'production', 'test']).default('development'),
  }),
  client: z.object({
    NEXT_PUBLIC_APP_NAME: z.string().default('My App'),
  }),
  runtimeEnv: {
    DATABASE_URL:         process.env.DATABASE_URL,
    PORT:                 process.env.PORT,
    NODE_ENV:             process.env.NODE_ENV,
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
  },
})
```

- Native schemas and Zod schemas can be mixed: `server: z.object({ ... }), client: { NEXT_PUBLIC_X: str() }`.
- All adapter rules (NEXT_PUBLIC_ prefix enforcement, browser-context stripping, etc.) apply equally.
- Zod coercions, transforms, and defaults work end-to-end.
- Validation failures from Zod are mapped to the same `ValidationFailure` shape and included in the pretty-printed error output.

---

## Server-only TypeScript branding

Every key in the `server` schema is branded as `ServerOnly<T>` in the returned env object. The brand is visible in IDE tooltips, making the origin of a value clear at a glance.

For stricter enforcement, import the `ClientEnv<T>` utility type to strip server vars from a type entirely — TypeScript will then error if you reference a server key where only client vars are expected:

```ts
import type { ClientEnv } from 'next-safe-env'
import { env } from '@/env'

// Only client vars — server vars are excluded at the type level
type ClientVars = ClientEnv<typeof env>

// Usage in a client-facing function:
function renderHeader(vars: ClientVars) {
  return vars.NEXT_PUBLIC_APP_NAME  // ✅ fine
  // vars.DATABASE_URL              // ✗ TypeScript error: property does not exist
}
```

> For a hard module-level guard, add `import 'server-only'` at the top of your `env.ts` file. This makes Next.js throw at build time if the module is imported in a client bundle.

---

## Usage - Vite

For non-Next.js React apps that use `import.meta.env`. The `vite` adapter enforces the `VITE_` prefix on all client schema keys — Vite only exposes `VITE_` variables to the client bundle.

```ts
// src/env.ts
import { createEnv, str, url, port, bool } from 'next-safe-env'

export const env = createEnv({
  server: {
    DATABASE_URL: url(),
    PORT:         port().default(3000),
  },
  client: {
    VITE_API_URL:   url(),
    VITE_APP_NAME:  str().default('My App'),
    VITE_DEBUG:     bool().default(false),
  },
  runtimeEnv: {
    DATABASE_URL:  process.env.DATABASE_URL,
    PORT:          process.env.PORT,
    VITE_API_URL:  import.meta.env.VITE_API_URL,
    VITE_APP_NAME: import.meta.env.VITE_APP_NAME,
    VITE_DEBUG:    import.meta.env.VITE_DEBUG,
  },
  adapter: 'vite',
})
```

- Every key in `client` **must** be prefixed `VITE_`. The adapter throws immediately if it isn't.
- Server vars are stripped from the returned object when running in a browser context.
- The `vite` adapter is **auto-detected** when any client key starts with `VITE_` (a console warning prompts you to set `adapter: 'vite'` explicitly to suppress it).

---

## CLI

`next-safe-env` ships a CLI you can run with `npx` — no install required.

```bash
npx next-safe-env <command>
```

---

### `check` — validate before you deploy

Validates the current environment against your schema **without starting the app**. Useful in CI pipelines to gate deployments before they reach production.

```bash
npx next-safe-env check [file]
```

| Argument | Default | Description |
|---|---|---|
| `file` | `src/env.js`, then `dist/env.js` | Path to the compiled env file to validate |

**Exit codes**

| Code | Meaning |
|---|---|
| `0` | All environment variables are valid |
| `1` | One or more variables are missing or invalid |

The command imports your env file in an isolated child process. Because `createEnv` runs at import time, any validation failure triggers the same formatted error output you'd see at startup — then the process exits with code `1`.

**Examples**

```bash
# Auto-discover src/env.js or dist/env.js
npx next-safe-env check

# Point at a specific compiled file
npx next-safe-env check ./dist/env.js

# In a CI step (non-zero exit halts the pipeline)
npx next-safe-env check && echo "Env OK, deploying..."
```

**Sample output on failure**

```
[next-safe-env] Checking src/env.js...

[next-safe-env] Environment validation failed — 2 error(s):

  ✗ DATABASE_URL     — Expected valid URL. Got: "postgres-localhost"
  ✗ JWT_SECRET       — Expected length >= 32. Got length: 12

  Server vars:  1 valid, 2 invalid
  Client vars:  2 valid, 0 invalid

  Set the correct values in your .env file or deployment environment and restart.

[next-safe-env] ✗ Validation failed.
```

> **Note:** `check` imports your compiled `.js` file — not the `.ts` source. Build your project first (`npm run build`) or use a TypeScript runner like `tsx`:
> ```bash
> tsx node_modules/.bin/next-safe-env check ./src/env.ts
> ```

---

### `init` — interactive scaffold

Generates `src/env.ts` and `.env.example` by asking which variables your app needs and what type each one should be.

```bash
npx next-safe-env init [options]
```

| Option | Default | Description |
|---|---|---|
| `--output <path>` | `src/env.ts` | Output path for the generated `env.ts` |

**What it asks**

1. Framework — `Next.js`, `Node.js`, `Vite`, or `Edge Runtime` (determines the adapter and client-var prefix)
2. Server-side variables — name, type, optional flag, default value, and (for `str`) allowed values
3. Client-side variables — same prompts; variable names are auto-prefixed (`NEXT_PUBLIC_` or `VITE_`) if you omit the prefix
4. Output file path
5. Whether to generate `.env.example`

**Example session**

```
$ npx next-safe-env init

next-safe-env init — Interactive scaffold

Which framework are you using?
  1. Next.js
  2. Node.js
  3. Vite
  4. Edge Runtime

> 1

Server-side variables (press Enter with empty name to finish):

  Variable name (or Enter to finish): DATABASE_URL
  Type [str/url/num/port/bool] (str): url
  Optional? [y/n] (n): n
  Default value (Enter for none):
  Allowed values, comma-separated (Enter to skip):

  Variable name (or Enter to finish): PORT
  Type [str/url/num/port/bool] (str): port
  Optional? [y/n] (n): n
  Default value (Enter for none): 3000

  Variable name (or Enter to finish):

Client-side variables (must start with NEXT_PUBLIC_, press Enter to finish):

  Variable name (or Enter to finish): NEXT_PUBLIC_APP_NAME
  Type [str/url/num/port/bool] (str):
  Optional? [y/n] (n): n
  Default value (Enter for none): My App
  Allowed values, comma-separated (Enter to skip):

  Variable name (or Enter to finish):

Output file [src/env.ts]:
Generate .env.example? [y/n] (y): y

✓ Generated src/env.ts
✓ Generated .env.example
```

**Generated `src/env.ts`**

```ts
import { createEnv, port, str, url } from 'next-safe-env'

export const env = createEnv({
  server: {
    DATABASE_URL: url(),
    PORT: port().default(3000),
  },
  client: {
    NEXT_PUBLIC_APP_NAME: str().default('My App'),
  },
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    PORT: process.env.PORT,
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
  },
  adapter: 'nextjs',
})
```

---

### `.env.example` generation

Running `init` with the `.env.example` prompt answered `y` produces a commented template alongside `src/env.ts`. Each variable gets an inline comment describing its type, whether it is required, any constraints, and its default value — so new contributors know exactly what to fill in.

**Example `.env.example`**

```dotenv
# ---- Server-side variables ----

# DATABASE_URL — required valid URL
DATABASE_URL=

# PORT — required port number (1–65535)
# Default: 3000
PORT=3000

# NODE_ENV — required string
# Allowed values: development | production | test
NODE_ENV=

# ---- Client-side variables ----

# NEXT_PUBLIC_APP_NAME — required string
# Default: My App
NEXT_PUBLIC_APP_NAME=My App
```

---

## Contributing

Issues and PRs are welcome. Before opening a PR, run:

```bash
npm run typecheck   # tsc --noEmit
npm test            # vitest run
npm run build       # tsup
```

All three must pass. New features should come with tests; bug fixes should come with a regression test.

---

## License

MIT © 2026

---

> Built because `process.env.X` should never be `string | undefined` in a typed codebase and getting full validation, type inference, and Next.js adapter support shouldn't require adding new dependencies to do it.
