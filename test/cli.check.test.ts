import { describe, it, expect } from 'vitest'
import { resolve } from 'path'
import { checkEnvFile } from '../src/cli/check.js'

const fixture = (name: string) => resolve(__dirname, 'fixtures', name)

describe('checkEnvFile', () => {
  it('returns success when the env file exits 0', () => {
    const result = checkEnvFile(fixture('cli-check-success.mjs'))
    expect(result.success).toBe(true)
  })

  it('returns failure when the env file exits 1', () => {
    const result = checkEnvFile(fixture('cli-check-fail.mjs'))
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.reason).toBe('validation-failed')
      expect(result.exitCode).toBe(1)
    }
  })

  it('returns file-not-found when the file does not exist', () => {
    const result = checkEnvFile(fixture('does-not-exist.mjs'))
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.reason).toBe('file-not-found')
      expect(result.exitCode).toBe(1)
    }
  })

  it('reports the file path in the result', () => {
    const filePath = fixture('cli-check-success.mjs')
    const result = checkEnvFile(filePath)
    expect(result.filePath).toBe(filePath)
  })
})
