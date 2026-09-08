import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const expectedTag = 'v1.0.6'
const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url)))
if (packageJson.version !== expectedTag.slice(1)) throw new Error(`package version must remain 1.0.6, got ${packageJson.version}`)
if (process.env.GITHUB_REF && process.env.GITHUB_REF !== `refs/tags/${expectedTag}`) {
  throw new Error(`release workflow received ${process.env.GITHUB_REF}; only refs/tags/${expectedTag} may publish`)
}
if (process.env.GITHUB_SHA) {
  const tags = execFileSync('git', ['tag', '--points-at', process.env.GITHUB_SHA], { encoding: 'utf8' })
    .split('\n')
    .filter(Boolean)
  if (tags.length !== 1 || tags[0] !== expectedTag) throw new Error(`commit is not pointed to exclusively by ${expectedTag}`)
}
console.log(`verified exact release tag ${expectedTag}`)
