import { createInterface } from 'readline'
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs'
import { resolve, dirname } from 'path'

export type VarType = 'str' | 'num' | 'bool' | 'url' | 'port'

export type VarConfig = {
  name: string
  type: VarType
  optional: boolean
  default?: string | number | boolean
  enum?: string[]
  min?: number
  max?: number
}

export type InitConfig = {
  adapter: 'nextjs' | 'node' | 'vite' | 'edge'
  server: VarConfig[]
  client: VarConfig[]
}

// ---------------------------------------------------------------------------
// Pure content generators (exported for testing)
// ---------------------------------------------------------------------------

export function generateEnvTs(config: InitConfig): string {
  const allVars = [...config.server, ...config.client]
  const imports = deriveImports(allVars)
  const isVite = config.adapter === 'vite'

  const lines: string[] = [
    `import { ${imports.join(', ')} } from 'next-safe-env'`,
    '',
    'export const env = createEnv({',
    '  server: {',
  ]

  for (const v of config.server) {
    lines.push(`    ${v.name}: ${buildValidatorChain(v)},`)
  }

  lines.push('  },')
  lines.push('  client: {')

  for (const v of config.client) {
    lines.push(`    ${v.name}: ${buildValidatorChain(v)},`)
  }

  lines.push('  },')
  lines.push('  runtimeEnv: {')

  for (const v of config.server) {
    lines.push(`    ${v.name}: process.env.${v.name},`)
  }
  for (const v of config.client) {
    const src = isVite ? `import.meta.env.${v.name}` : `process.env.${v.name}`
    lines.push(`    ${v.name}: ${src},`)
  }

  lines.push('  },')
  lines.push(`  adapter: '${config.adapter}',`)
  lines.push('})')
  lines.push('')

  return lines.join('\n')
}

export function generateEnvExample(config: InitConfig): string {
  const lines: string[] = []

  if (config.server.length > 0) {
    lines.push('# ---- Server-side variables ----')
    lines.push('')
    for (const v of config.server) {
      lines.push(...varComment(v))
      lines.push(varAssignment(v))
      lines.push('')
    }
  }

  if (config.client.length > 0) {
    lines.push('# ---- Client-side variables ----')
    lines.push('')
    for (const v of config.client) {
      lines.push(...varComment(v))
      lines.push(varAssignment(v))
      lines.push('')
    }
  }

  return lines.join('\n')
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TYPE_LABEL: Record<VarType, string> = {
  str: 'string',
  num: 'number',
  bool: 'boolean (true | false | 1 | 0 | yes | no | on | off)',
  url: 'valid URL',
  port: 'port number (1–65535)',
}

function varComment(v: VarConfig): string[] {
  const required = v.optional ? 'optional' : 'required'
  const lines = [`# ${v.name} — ${required} ${TYPE_LABEL[v.type]}`]

  if (v.enum && v.enum.length > 0) lines.push(`# Allowed values: ${v.enum.join(' | ')}`)
  if (v.min !== undefined) lines.push(`# Min: ${v.min}`)
  if (v.max !== undefined) lines.push(`# Max: ${v.max}`)
  if (v.default !== undefined) lines.push(`# Default: ${v.default}`)

  return lines
}

function varAssignment(v: VarConfig): string {
  return `${v.name}=${v.default !== undefined ? String(v.default) : ''}`
}

function buildValidatorChain(v: VarConfig): string {
  let chain =
    v.type === 'url' ? 'url()'
    : v.type === 'port' ? 'port()'
    : v.type === 'bool' ? 'bool()'
    : v.type === 'num' ? 'num()'
    : 'str()'

  if (v.enum && v.enum.length > 0) {
    chain += `.enum([${v.enum.map((e) => `'${e}'`).join(', ')}])`
  }
  if (v.min !== undefined) chain += `.min(${v.min})`
  if (v.max !== undefined) chain += `.max(${v.max})`
  if (v.optional) chain += '.optional()'
  if (v.default !== undefined) {
    const val = typeof v.default === 'string' ? `'${v.default}'` : String(v.default)
    chain += `.default(${val})`
  }

  return chain
}

function deriveImports(vars: VarConfig[]): string[] {
  const needed = new Set<string>()
  for (const v of vars) {
    needed.add(v.type === 'url' ? 'url' : v.type === 'port' ? 'port' : v.type)
  }
  const validators = [...needed].sort()
  return ['createEnv', ...validators]
}

// ---------------------------------------------------------------------------
// Adapter detection + output path helpers
// ---------------------------------------------------------------------------

export function detectAdapter(): InitConfig['adapter'] | null {
  try {
    const pkgPath = resolve(process.cwd(), 'package.json')
    if (!existsSync(pkgPath)) return null
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))
    const deps: Record<string, string> = { ...pkg.dependencies, ...pkg.devDependencies }
    if ('next' in deps) return 'nextjs'
    if ('vite' in deps) return 'vite'
    if (
      '@cloudflare/workers-types' in deps ||
      '@vercel/edge-runtime' in deps ||
      'miniflare' in deps
    )
      return 'edge'
    return 'node'
  } catch {
    return null
  }
}

export function defaultOutputPath(adapter: InitConfig['adapter']): string {
  if (adapter === 'nextjs') {
    if (existsSync(resolve(process.cwd(), 'src/app'))) return 'src/app/env.ts'
    return 'app/env.ts'
  }
  return 'src/env.ts'
}

// ---------------------------------------------------------------------------
// Interactive scaffold
// ---------------------------------------------------------------------------

export async function runInit(args: string[]): Promise<void> {
  const outputFlagIdx = args.indexOf('--output')
  const cliOutputOverride = outputFlagIdx >= 0 ? args[outputFlagIdx + 1] : undefined

  const rl = createInterface({ input: process.stdin, output: process.stdout })
  const ask = (q: string): Promise<string> => new Promise((res) => rl.question(q, res))

  console.log('\nnext-safe-env init — Interactive scaffold\n')

  // 1. Adapter — auto-detect, fall back to asking
  const adapterMap: Record<string, InitConfig['adapter']> = {
    '1': 'nextjs', nextjs: 'nextjs', next: 'nextjs',
    '2': 'node',   node: 'node',
    '3': 'vite',   vite: 'vite',
    '4': 'edge',   edge: 'edge',
  }

  let adapter: InitConfig['adapter']
  const detected = detectAdapter()
  if (detected) {
    const label = { nextjs: 'Next.js', node: 'Node.js', vite: 'Vite', edge: 'Edge Runtime' }[detected]
    console.log(`Detected adapter: ${label}`)
    const confirm = (await ask(`Use ${label}? [y/n] (y): `)).trim().toLowerCase()
    if (confirm === 'n') {
      console.log('\nWhich framework are you using?')
      console.log('  1. Next.js')
      console.log('  2. Node.js')
      console.log('  3. Vite')
      console.log('  4. Edge Runtime')
      const fwAnswer = (await ask('\n> ')).trim().toLowerCase()
      adapter = adapterMap[fwAnswer] ?? 'nextjs'
    } else {
      adapter = detected
    }
  } else {
    console.log('Which framework are you using?')
    console.log('  1. Next.js')
    console.log('  2. Node.js')
    console.log('  3. Vite')
    console.log('  4. Edge Runtime')
    const fwAnswer = (await ask('\n> ')).trim().toLowerCase()
    adapter = adapterMap[fwAnswer] ?? 'nextjs'
  }

  // 2. Server vars
  const server: VarConfig[] = []
  console.log('\nServer-side variables (press Enter with empty name to finish):\n')
  for (;;) {
    const name = (await ask('  Variable name (or Enter to finish): ')).trim().toUpperCase()
    if (!name) break
    const varConfig = await collectVar(ask, name)
    server.push(varConfig)
    console.log()
  }

  // 3. Client vars (Next.js + Vite only)
  const client: VarConfig[] = []
  const prefix = adapter === 'vite' ? 'VITE_' : 'NEXT_PUBLIC_'
  if (adapter === 'nextjs' || adapter === 'vite') {
    console.log(`\nClient-side variables (must start with ${prefix}, press Enter to finish):\n`)
    for (;;) {
      let nameRaw = (await ask('  Variable name (or Enter to finish): ')).trim().toUpperCase()
      if (!nameRaw) break
      if (!nameRaw.startsWith(prefix)) nameRaw = prefix + nameRaw
      const varConfig = await collectVar(ask, nameRaw)
      client.push(varConfig)
      console.log()
    }
  }

  // 4. Output path + .env.example toggle
  const smartDefault = cliOutputOverride ?? defaultOutputPath(adapter)
  const outputAnswer = (await ask(`\nOutput file [${smartDefault}]: `)).trim()
  const outputPath = outputAnswer || smartDefault
  const exampleAnswer = (await ask('Generate .env.example? [y/n] (y): ')).trim().toLowerCase()
  const generateExample = exampleAnswer !== 'n'

  rl.close()

  const initConfig: InitConfig = { adapter, server, client }

  // Write env.ts
  const absOut = resolve(outputPath)
  const dir = dirname(absOut)
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  writeFileSync(absOut, generateEnvTs(initConfig), 'utf8')
  console.log(`\n✓ Generated ${outputPath}`)

  // Write .env.example
  if (generateExample) {
    writeFileSync(resolve('.env.example'), generateEnvExample(initConfig), 'utf8')
    console.log('✓ Generated .env.example')
  }

  console.log()
}

async function collectVar(
  ask: (q: string) => Promise<string>,
  name: string,
): Promise<VarConfig> {
  const typeRaw = (await ask('  Type [str/url/num/port/bool] (str): ')).trim().toLowerCase()
  const validTypes: VarType[] = ['str', 'url', 'num', 'port', 'bool']
  const type: VarType = validTypes.includes(typeRaw as VarType) ? (typeRaw as VarType) : 'str'

  const optRaw = (await ask('  Optional? [y/n] (n): ')).trim().toLowerCase()
  const optional = optRaw === 'y'

  const defRaw = (await ask('  Default value (Enter for none): ')).trim()
  let defaultVal: string | number | boolean | undefined
  if (defRaw === '') {
    defaultVal = undefined
  } else if (type === 'num' || type === 'port') {
    defaultVal = Number(defRaw)
  } else if (type === 'bool') {
    defaultVal = defRaw === 'true' || defRaw === '1' || defRaw === 'yes' || defRaw === 'on'
  } else {
    defaultVal = defRaw
  }

  let enumValues: string[] | undefined
  if (type === 'str') {
    const enumRaw = (await ask('  Allowed values, comma-separated (Enter to skip): ')).trim()
    if (enumRaw) {
      enumValues = enumRaw.split(',').map((s) => s.trim()).filter(Boolean)
    }
  }

  const varConfig: VarConfig = { name, type, optional }
  if (defaultVal !== undefined) varConfig.default = defaultVal
  if (enumValues !== undefined) varConfig.enum = enumValues
  return varConfig
}
