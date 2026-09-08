import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(process.argv[2] ?? process.cwd())
const outputDir = resolve(process.argv[3] ?? resolve(root, '.artifacts', 'pack'))

// A pack directory is single-use. Reusing it could make a verifier inspect a
// stale tarball after npm changed the package version.
rmSync(outputDir, { recursive: true, force: true })
mkdirSync(outputDir, { recursive: true })

const raw = execFileSync('npm', ['pack', '--ignore-scripts', '--json', '--pack-destination', outputDir], {
  cwd: root,
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'inherit'],
})
const entries = JSON.parse(raw)
if (!Array.isArray(entries) || entries.length !== 1 || typeof entries[0]?.filename !== 'string') {
  throw new Error(`npm pack produced an unexpected result: ${raw}`)
}

const files = readdirSync(outputDir).filter((name) => name.endsWith('.tgz'))
if (files.length !== 1 || files[0] !== entries[0].filename || !existsSync(resolve(outputDir, files[0]))) {
  throw new Error(`expected exactly one captured tarball in ${outputDir}`)
}

process.stdout.write(`${resolve(outputDir, files[0])}\n`)
