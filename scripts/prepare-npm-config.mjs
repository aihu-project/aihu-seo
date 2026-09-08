import { chmodSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'

const userConfig = process.env.NPM_CONFIG_USERCONFIG
const globalConfig = process.env.NPM_CONFIG_GLOBALCONFIG
if (!userConfig || !globalConfig) {
  throw new Error('NPM_CONFIG_USERCONFIG and NPM_CONFIG_GLOBALCONFIG must name controlled files')
}

const blockedNames = /^(?:NODE_AUTH_TOKEN|NPM_TOKEN|npm_config_.*(?:auth|token|password|username))$/i
const blocked = Object.keys(process.env).filter((name) => blockedNames.test(name) && process.env[name])
if (blocked.length) {
  throw new Error(`classic npm credentials are present in the environment (${blocked.join(', ')})`)
}

for (const path of [userConfig, globalConfig]) mkdirSync(dirname(path), { recursive: true })
writeFileSync(userConfig, 'registry=https://registry.npmjs.org/\n', { mode: 0o600 })
writeFileSync(globalConfig, '# deliberately empty: trusted publishing supplies OIDC credentials\n', { mode: 0o600 })
chmodSync(userConfig, 0o600)
chmodSync(globalConfig, 0o600)
console.log('prepared controlled npm user and global config files')
