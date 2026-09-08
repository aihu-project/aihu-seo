import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'

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

const blockedNames = /^(?:NODE_AUTH_TOKEN|NPM_TOKEN|npm_config_.*(?:auth|token|password|username))$/i
const blocked = Object.keys(process.env).filter((name) => blockedNames.test(name) && process.env[name])
if (blocked.length) {
  throw new Error(`classic npm credentials are present in the environment (${blocked.join(', ')})`)
}
const userConfig = process.env.NPM_CONFIG_USERCONFIG
const globalConfig = process.env.NPM_CONFIG_GLOBALCONFIG
if (!userConfig || !globalConfig) throw new Error('controlled user and global npm configs are required')
for (const path of [userConfig, globalConfig]) {
  if (!existsSync(path)) throw new Error(`controlled npm config is missing: ${path}`)
  const config = readFileSync(path, 'utf8')
  if (/_authToken|_auth\s*=|token\s*=|password\s*=|username\s*=/i.test(config)) {
    throw new Error(`controlled npm config contains a credential: ${path}`)
  }
}
const projectConfig = new URL('../.npmrc', import.meta.url)
if (existsSync(projectConfig)) {
  const config = readFileSync(projectConfig, 'utf8')
  if (/_authToken|_auth\s*=|token\s*=|password\s*=|username\s*=/i.test(config)) {
    throw new Error('project .npmrc contains a credential; trusted publishing is fail-closed')
  }
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
