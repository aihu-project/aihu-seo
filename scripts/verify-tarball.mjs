import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { basename } from 'node:path'

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
const manifestText = JSON.stringify(packageJson)
if (manifestText.includes('workspace:')) throw new Error('workspace dependency specifier leaked into tarball')

const members = execFileSync('tar', ['-tzf', tarball], { encoding: 'utf8' })
  .trim()
  .split('\n')
  .filter(Boolean)
const forbidden = members.filter((name) => /(^|\/)src\/|(^|\/)tests\/|node_modules|\.github/.test(name))
if (forbidden.length) throw new Error(`source/test files leaked into tarball: ${forbidden.join(', ')}`)
for (const required of ['package/package.json', 'package/LICENSE', 'package/README.md', 'package/install-manifest.json', 'package/dist/index.js', 'package/dist/index.d.ts']) {
  if (!members.includes(required)) throw new Error(`tarball is missing ${required}`)
}

console.log(`verified ${tarball}: identity, exports, published dependency ranges, and files`)
