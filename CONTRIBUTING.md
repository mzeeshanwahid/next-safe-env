# Contributing

There are many ways to contribute to `next-safe-env`, all of which are valuable. Before you start, please create an issue describing what you want to build or fix, someone may already be working on it, or there may be a reason it isn't implemented yet. The maintainer will point you in the right direction.

## Development setup

1. Fork and clone the repo:

   ```sh
   git clone git@github.com:mzeeshanwahid/next-safe-env.git
   cd next-safe-env
   ```

2. Install dependencies:

   ```sh
   npm install
   ```

3. Start experimenting - edit `src/` directly or add a scratch file at the root to try things out.

## Commands

**`npm run build`**

Compiles `src` to `dist` via tsup.

**`npm run dev`**

Compiles in watch mode, useful while iterating on the source.

**`npm test`**

Runs all Vitest tests once.

**`npm run test:watch`**

Runs Vitest in interactive watch mode.

**`npm run lint`**

Lints `src` with ESLint.

**`npm run typecheck`**

Type-checks the project without emitting output.

## Tests

Tests live in the `test/` directory and use [Vitest](https://vitest.dev). When adding a feature or fixing a bug, add or update the relevant test file. Run `npm test` before submitting your PR to make sure nothing is broken.

Test files are organized by concern:

- `test/validators.test.ts` - `str`, `num`, `bool`, `url`, `port` and fluent chaining
- `test/errors.test.ts` - `FieldError`, `EnvValidationError` formatting
- `test/core.test.ts` - `createEnv()` validation loop, freeze behavior
- `test/nextjs.test.ts` - Next.js adapter (`NEXT_PUBLIC_` enforcement, browser stripping)
- `test/edge.test.ts` - Edge Runtime adapter

## Project structure

```
src/
  index.ts          public API
  types.ts          shared TypeScript types
  errors.ts         FieldError, EnvValidationError
  validators.ts     StringValidator, NumberValidator, BooleanValidator + shorthands
  core.ts           createEnv() engine
  adapters/
    node.ts         passthrough adapter
    edge.ts         strips non-NEXT_PUBLIC_ vars after validation
    nextjs.ts       enforces NEXT_PUBLIC_ on client keys; strips server vars in browser
    index.ts        resolveAdapter() auto-detection
```

## Pull request guidelines

- Keep changes focused - one concern per PR.
- Update or add tests for every change.
- Run `npm run typecheck && npm test` locally before pushing.
- If your change affects public API behavior, describe the impact clearly in the PR description.

## License

By contributing your code to this repository, you agree to license your contribution under the [MIT license](LICENSE).
