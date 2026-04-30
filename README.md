<div align="center">
  <img src="https://raw.githubusercontent.com/mzeeshanwahid/next-safe-env/main/assets/logo-nobg.png" width="400" alt="next-safe-env logo" />
  <h1>next-safe-env</h1>
  <p>Typed, validated environment variables for Next.js and Node.js. Crash at startup, never at runtime.</p>
</div>

<br/>

<p align="center"><a href="https://www.npmjs.com/package/next-safe-env"><img src="https://img.shields.io/npm/v/next-safe-env?color=0ea5e9&label=npm" alt="npm version" /></a> <a href="https://bundlephobia.com/package/next-safe-env"><img src="https://img.shields.io/bundlephobia/minzip/next-safe-env?color=22c55e&label=gzipped" alt="bundle size" /></a> <a href="./LICENSE"><img src="https://img.shields.io/npm/l/next-safe-env?color=a855f7" alt="license" /></a> <a href="https://github.com/mzeeshanwahid/next-safe-env/actions"><img src="https://img.shields.io/github/actions/workflow/status/mzeeshanwahid/next-safe-env/ci.yml?label=tests" alt="tests" /></a> <a href="./package.json"><img src="https://img.shields.io/badge/dependencies-zero-f97316" alt="zero dependencies" /></a> <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-5.x-3178c6" alt="TypeScript" /></a></p>

---

## The Problem

Every Next.js and Node.js project has the same boilerplate:

```ts
const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) throw new Error('Missing DATABASE_URL')

const PORT = parseInt(process.env.PORT ?? '3000', 10)
if (isNaN(PORT)) throw new Error('PORT must be a number')
```

`process.env.X` is always `string | undefined` - no types, no autocomplete. Missing or malformed vars surface mid-request, not at startup. Nothing stops you from reading a server secret in a client component and getting a silent `undefined` in the browser. Every project re-writes the same validation logic with no single place to audit what the app needs to run.

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

If your project already uses a schema validation library, tools like `t3-env` or `envalid` integrate well with your existing setup. `next-safe-env` is for teams that want typed, validated env vars with no additional dependencies - the full feature set ships in under 5 kB.

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

> `next-safe-env` validates what is already in `process.env`. It does not load `.env` files. For that, use Next.js's built-in `.env` support or `dotenv`.

---

## Quick Start

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
env.PORT                  // number - not string
env.NEXT_PUBLIC_APP_NAME  // string
```

If any variable is missing or invalid, the app refuses to start and prints every problem at once:

```
[next-safe-env] Environment validation failed - 3 error(s):

  ✗ DATABASE_URL  - Required. Expected a valid URL. Got: "postgres-localhost"
  ✗ JWT_SECRET    - Too short. Must be ≥ 32 characters. Got length: 12
  ✗ SMTP_PORT     - Invalid port. Must be 1–65535. Got: "99999"
```

---

## Documentation

The full documentation is available at **[next-safe-env.dev](https://next-safe-env.dev)**.

### Guides

- [Getting Started](https://next-safe-env.dev/quickstart) - Install and validate your first env var in minutes
- [Next.js App Router](https://next-safe-env.dev/guides/nextjs) - Server/client splitting with automatic `NEXT_PUBLIC_` enforcement
- [Node.js](https://next-safe-env.dev/guides/nodejs) - Plain Node.js servers, APIs, and CLI scripts
- [Edge Runtime](https://next-safe-env.dev/guides/edge-runtime) - Vercel Edge Runtime and Next.js Middleware
- [Vite](https://next-safe-env.dev/guides/vite) - Non-Next.js React apps with `import.meta.env`
- [Zod Interop](https://next-safe-env.dev/guides/zod-interop) - Pass `z.object(...)` schemas directly, no rewrites needed
- [Testing](https://next-safe-env.dev/guides/testing) - Skip validation in test environments without removing your schema

### API Reference

- [Validators](https://next-safe-env.dev/api/validators) - `str`, `num`, `bool`, `url`, `port` and their chainable rules
- [createEnv()](https://next-safe-env.dev/api/create-env) - Full reference for every configuration option
- [TypeScript Types](https://next-safe-env.dev/api/types) - `ServerOnly<T>`, `ClientEnv<T>`, and all exported types

### Concepts

- [Adapters](https://next-safe-env.dev/concepts/adapters) - How Next.js, Node.js, Edge Runtime, and Vite adapters work
- [Server & Client Split](https://next-safe-env.dev/concepts/server-client-split) - How env vars are separated and protected per runtime context
- [Error Handling](https://next-safe-env.dev/concepts/error-handling) - Validation errors, pretty output, and custom error handlers

---

`next-safe-env` was built because `process.env.X` should never be `string | undefined` in a typed codebase - and getting full validation, type inference, and Next.js adapter support shouldn't require adding new dependencies to do it.

MIT © 2026
