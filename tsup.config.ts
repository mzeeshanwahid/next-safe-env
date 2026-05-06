import { defineConfig } from 'tsup'

export default defineConfig([
  // Library — ESM + CJS with type declarations
  {
    entry: ['src/index.ts'],
    format: ['esm', 'cjs'],
    dts: true,
    clean: true,
    splitting: false,
    sourcemap: true,
    minify: false,
    treeshake: true,
    target: 'node18',
    outDir: 'dist',
  },
  // CLI — ESM only, self-contained executable
  {
    entry: { 'cli/index': 'src/cli/index.ts' },
    format: ['esm'],
    dts: false,
    clean: false,
    splitting: false,
    sourcemap: false,
    minify: false,
    treeshake: true,
    target: 'node18',
    outDir: 'dist',
    banner: { js: '#!/usr/bin/env node' },
  },
])
