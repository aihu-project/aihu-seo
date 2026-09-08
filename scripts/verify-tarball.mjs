import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { basename } from 'node:path'
import { EXPECTED_PACKAGE_FILES, EXPECTED_TARBALL_FILES } from './release-files.mjs'

const tarball = process.argv[2]
if (!tarball) throw new Error('usage: node scripts/verify-tarball.mjs /absolute/path/package.tgz')

function tarRead(name) {
  return execFileSync('tar', ['-xOzf', tarball, name], { encoding: 'utf8' })
}

const packageJson = JSON.parse(tarRead('package/package.json'))
const expectedDeps = {
  '@aihu/plugin': '^0.1.1',
  '@aihu/server': '^0.6.0',
  '@aihu-plugin/agent-readiness': '^2.3.0',
}
if (packageJson.name !== '@aihu/seo') throw new Error(`tarball name is ${packageJson.name}`)
if (packageJson.version !== '1.0.6') throw new Error(`tarball version is ${packageJson.version}`)
if (basename(tarball) !== 'aihu-seo-1.0.6.tgz') throw new Error(`unexpected tarball filename: ${basename(tarball)}`)
if (packageJson.exports?.['.']?.import !== './dist/index.js') throw new Error('import export is not ./dist/index.js')
if (packageJson.exports?.['.']?.types !== './dist/index.d.ts') throw new Error('types export is not ./dist/index.d.ts')
if (JSON.stringify(packageJson.dependencies) !== JSON.stringify(expectedDeps)) {
  throw new Error(`published dependency ranges changed: ${JSON.stringify(packageJson.dependencies)}`)
}
if (JSON.stringify(packageJson.files) !== JSON.stringify(EXPECTED_PACKAGE_FILES)) {
  throw new Error(`published files declaration changed: ${JSON.stringify(packageJson.files)}`)
}
const manifestText = JSON.stringify(packageJson)
if (manifestText.includes('workspace:')) throw new Error('workspace dependency specifier leaked into tarball')

const members = execFileSync('tar', ['-tzf', tarball], { encoding: 'utf8' })
  .trim()
  .split('\n')
  .filter(Boolean)
const actualFiles = [...members].sort()
const expectedFiles = [...EXPECTED_TARBALL_FILES].sort()
if (JSON.stringify(actualFiles) !== JSON.stringify(expectedFiles)) {
  const unexpected = actualFiles.filter((name) => !expectedFiles.includes(name))
  const missing = expectedFiles.filter((name) => !actualFiles.includes(name))
  throw new Error(`tarball file allowlist mismatch; unexpected=${unexpected.join(', ') || 'none'}; missing=${missing.join(', ') || 'none'}`)
}

console.log(`verified ${tarball}: identity, exports, published dependency ranges, and files`)
