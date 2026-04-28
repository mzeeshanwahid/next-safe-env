import type { Adapter } from '../types.js'

/** Passthrough adapter for plain Node.js. All vars from both schemas are available. */
export const nodeAdapter: Adapter = {
  name: 'node',
  beforeValidate: (_serverSchema, _clientSchema, rawEnv) => rawEnv,
  afterValidate: (env) => env,
}
