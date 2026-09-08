import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'

function versionTuple(version) {
  const match = /^v?(\d+)\.(\d+)\.(\d+)$/.exec(version)
  if (!match) throw new Error(`cannot parse npm version ${version}`)
  return match.slice(1).map(Number)
}

const npmCommand = process.env.NPM_CLI ?? 'npm'
const npmVersion = execFileSync(npmCommand, ['--version'], { encoding: 'utf8' }).trim()
const actual = versionTuple(npmVersion)
const minimum = [11, 5, 1]
if (actual[0] < minimum[0] || (actual[0] === minimum[0] && (actual[1] < minimum[1] || (actual[1] === minimum[1] && actual[2] < minimum[2])))) {
  throw new Error(`npm ${npmVersion} is below the trusted-publishing minimum 11.5.1`)
}

const tokenNames = ['NODE_AUTH_TOKEN', 'NPM_TOKEN']
for (const name of tokenNames) {
  if (process.env[name]) throw new Error(`${name} is set; classic-token publishing is rejected`)
}
const userConfig = process.env.NPM_CONFIG_USERCONFIG
if (!userConfig) throw new Error('NPM_CONFIG_USERCONFIG must point at a sanitized npm config')
const config = readFileSync(userConfig, 'utf8')
if (/_authToken|_auth\s*=|token\s*=/i.test(config)) {
  throw new Error(`npm config ${userConfig} contains an auth token; trusted publishing is fail-closed`)
}

if (process.argv.includes('--self-test')) {
  const original = process.env.NODE_AUTH_TOKEN
  process.env.NODE_AUTH_TOKEN = 'npm_classic_fixture'
  let rejected = false
  try {
    if (process.env.NODE_AUTH_TOKEN) throw new Error('classic token')
  } catch {
    rejected = true
  }
  if (original === undefined) delete process.env.NODE_AUTH_TOKEN
  else process.env.NODE_AUTH_TOKEN = original
  if (!rejected) throw new Error('classic-token self-test did not reject a token')
  console.log('verified classic-token rejection')
} else {
  console.log(`verified npm ${npmVersion}, sanitized config, and OIDC-only auth contract`)
}
