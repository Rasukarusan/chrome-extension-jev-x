import { build, context } from 'esbuild'
import { cp, rm } from 'node:fs/promises'

const watch = process.argv.includes('--watch')

const options = {
  entryPoints: {
    background: 'src/background/index.ts',
    content: 'src/content/index.ts',
    options: 'src/options/index.ts',
  },
  outdir: 'dist',
  bundle: true,
  format: 'iife',
  target: 'chrome120',
  logLevel: 'info',
}

await rm('dist', { recursive: true, force: true })
await cp('public', 'dist', { recursive: true })

if (watch) {
  const ctx = await context(options)
  await ctx.watch()
} else {
  await build(options)
}
