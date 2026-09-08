import { execFileSync } from 'node:child_process'
import { cpSync, mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const npmCommand = process.env.NPM_CLI ?? 'npm'
const tarball = process.argv[2]
if (!tarball) throw new Error('usage: node scripts/verify-consumer.mjs /absolute/path/package.tgz')
const consumer = mkdtempSync(join(tmpdir(), 'aihu-seo-consumer-'))
cpSync(new URL('../consumer/package.json', import.meta.url), join(consumer, 'package.json'))
cpSync(new URL('../consumer/smoke.mjs', import.meta.url), join(consumer, 'smoke.mjs'))
execFileSync(npmCommand, ['install', '--ignore-scripts', '--no-package-lock', '--no-audit', '--no-fund', tarball], {
  cwd: consumer,
  stdio: 'inherit',
})
execFileSync('node', ['smoke.mjs'], { cwd: consumer, stdio: 'inherit' })
console.log(`verified isolated consumer against ${readFileSync(tarball).length} bytes at ${tarball}`)
