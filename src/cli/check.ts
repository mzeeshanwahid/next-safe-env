import { spawnSync } from 'child_process'
import { existsSync } from 'fs'
import { resolve } from 'path'
import { pathToFileURL } from 'url'

export type CheckResult =
  | { success: true; filePath: string }
  | { success: false; exitCode: number; reason: 'file-not-found' | 'validation-failed'; filePath: string }

/**
 * Validates a compiled env file by importing it in an isolated child process.
 * createEnv() runs at import time — if it fails it calls process.exit(1),
 * which the child process inherits. Exit code 0 = all vars valid.
 */
export function checkEnvFile(filePath: string): CheckResult {
  const absPath = resolve(filePath)

  if (!existsSync(absPath)) {
    return { success: false, exitCode: 1, reason: 'file-not-found', filePath }
  }

  const fileUrl = pathToFileURL(absPath).href
  // Top-level await is valid in --input-type=module (Node 18+)
  const script = `await import(${JSON.stringify(fileUrl)})`

  const proc = spawnSync(process.execPath, ['--input-type=module'], {
    input: script,
    env: process.env,
    stdio: ['pipe', 'inherit', 'inherit'],
  })

  if (proc.status === 0) {
    return { success: true, filePath }
  }

  return { success: false, exitCode: proc.status ?? 1, reason: 'validation-failed', filePath }
}

function findDefaultEnvFile(): string | undefined {
  const candidates = ['src/env.js', 'dist/env.js']
  return candidates.find((p) => existsSync(resolve(p)))
}

export function runCheck(args: string[]): void {
  const filePath = args[0] ?? findDefaultEnvFile()

  if (!filePath) {
    console.error(
      `[next-safe-env] Could not find a compiled env file. Tried: src/env.js, dist/env.js\n\n` +
        `Pass the path explicitly:\n  npx next-safe-env check ./path/to/env.js\n`,
    )
    process.exit(1)
    return
  }

  console.log(`\n[next-safe-env] Checking ${filePath}...\n`)

  const result = checkEnvFile(filePath)

  if (result.success) {
    console.log('[next-safe-env] ✓ All environment variables are valid.\n')
  } else {
    if (result.reason === 'file-not-found') {
      console.error(`[next-safe-env] File not found: ${resolve(filePath)}\n`)
    } else {
      console.error('[next-safe-env] ✗ Validation failed.\n')
    }
    process.exit(result.exitCode)
  }
}
