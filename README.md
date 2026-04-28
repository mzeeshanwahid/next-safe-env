<div align="center">
  <img src="https://raw.githubusercontent.com/mzeeshanwahid/next-safe-env/main/logo.png" width="400" alt="next-safe-env logo" />
  <h1>next-safe-env</h1>
  <p>Typed, validated environment variables for Next.js and Node.js. Crash at startup, never at runtime.</p>
</div>

<br/>

[![npm version](https://img.shields.io/npm/v/next-safe-env?color=0ea5e9&label=npm)](https://www.npmjs.com/package/next-safe-env)
[![bundle size](https://img.shields.io/bundlephobia/minzip/next-safe-env?color=22c55e&label=gzipped)](https://bundlephobia.com/package/next-safe-env)
[![license](https://img.shields.io/npm/l/next-safe-env?color=a855f7)](./LICENSE)
[![tests](https://img.shields.io/github/actions/workflow/status/mzeeshanwahid/next-safe-env/ci.yml?label=tests)](https://github.com/mzeeshanwahid/next-safe-env/actions)
[![zero dependencies](https://img.shields.io/badge/dependencies-zero-f97316)](./package.json)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178c6)](https://www.typescriptlang.org/)

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

## Roadmap

### Phase 2 - Ecosystem integrations

- **Zod interop adapter** - pass a Zod schema directly: `createEnv({ server: z.object({ ... }) })`. For teams already on Zod who want the Next.js adapter and error formatting without rewriting schemas.
- **Server-only TypeScript branding** - nominal types so that reading a server var in a client component produces a *compile error*, not just an autocomplete miss.
- **Vite adapter** - for non-Next.js React apps that use `import.meta.env` instead of `process.env`.

### Phase 3 - Tooling

- **`npx next-safe-env check`** - validate your environment against the schema without starting the app. Useful in CI to gate deployments before they reach production.
- **`npx next-safe-env init`** - interactive scaffold that generates `src/env.ts` by asking which vars you need and what type they should be.
- **`.env.example` generation** - auto-generate a commented `.env.example` from your schema, including the expected type and any constraints as inline comments.

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
