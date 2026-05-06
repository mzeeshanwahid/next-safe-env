import { runCheck } from './check.js'
import { runInit } from './init.js'

const [, , command, ...rest] = process.argv

switch (command) {
  case 'check':
    runCheck(rest)
    break

  case 'init':
    runInit(rest).catch((err: unknown) => {
      console.error(err instanceof Error ? err.message : String(err))
      process.exit(1)
    })
    break

  case '--help':
  case '-h':
  case undefined:
    printUsage()
    break

  default:
    console.error(`[next-safe-env] Unknown command: "${command}"\n`)
    printUsage()
    process.exit(1)
}

function printUsage(): void {
  console.log(
    `
next-safe-env — Typed, validated environment variables for Next.js and Node.js

Usage:
  npx next-safe-env <command> [options]

Commands:
  check [file]      Validate your current environment against the schema.
                    Defaults to src/env.js, then dist/env.js.
                    Exit 0 = valid, exit 1 = invalid.

  init [options]    Interactively generate src/env.ts and .env.example.
    --output <path>   Output path for env.ts  (default: src/env.ts)

Examples:
  npx next-safe-env check
  npx next-safe-env check ./dist/env.js
  npx next-safe-env init
  npx next-safe-env init --output config/env.ts
`.trim(),
  )
}
