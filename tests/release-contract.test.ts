import { execFileSync, spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()
const releaseWorkflow = readFileSync(join(root, '.github/workflows/release.yml'), 'utf8')

describe('release contract regressions', () => {
  it('does not give setup-node a token-writing registry configuration', () => {
    expect(releaseWorkflow).not.toContain('registry-url:')
    expect(releaseWorkflow).toContain('NPM_CONFIG_USERCONFIG:')
    expect(releaseWorkflow).toContain('NPM_CONFIG_GLOBALCONFIG:')
  })

  it('installs without lifecycle scripts and runs an explicit build', () => {
    expect(releaseWorkflow).toContain('npm ci --ignore-scripts')
    expect(releaseWorkflow).toContain('npm run build')
    expect(releaseWorkflow).toContain('npm install --global --ignore-scripts npm@11.5.1')
    expect(releaseWorkflow).not.toContain('prepublishOnly')
  })

  it('reasserts the publish contract in the same step as npm publish', () => {
    const publishStep = releaseWorkflow.slice(releaseWorkflow.indexOf('Reassert npm binary'))
    expect(publishStep).toContain('command -v npm')
    expect(publishStep).toContain('npm --version')
    expect(publishStep).toContain('node scripts/assert-oidc-contract.mjs')
    expect(publishStep).toContain('npm publish')
  })

  it('fails closed on a classic token without echoing the token value', () => {
    const fixture = mkdtempSync(join(tmpdir(), 'aihu-seo-contract-'))
    const user = join(fixture, 'user.npmrc')
    const global = join(fixture, 'global.npmrc')
    execFileSync(process.execPath, ['scripts/prepare-npm-config.mjs'], {
      cwd: root,
      env: { ...process.env, NPM_CONFIG_USERCONFIG: user, NPM_CONFIG_GLOBALCONFIG: global },
      encoding: 'utf8',
    })
    const token = 'fixture-token-must-not-appear'
    const result = spawnSync(process.execPath, ['scripts/assert-oidc-contract.mjs'], {
      cwd: root,
      env: {
        ...process.env,
        NPM_CONFIG_USERCONFIG: user,
        NPM_CONFIG_GLOBALCONFIG: global,
        NODE_AUTH_TOKEN: token,
      },
      encoding: 'utf8',
    })
    rmSync(fixture, { recursive: true, force: true })
    expect(result.status).not.toBe(0)
    expect(`${result.stdout}\n${result.stderr}`).not.toContain(token)
  })

  it('keeps README facts executable and release source binding documented', () => {
    expect(execFileSync(process.execPath, ['scripts/assert-readme-facts.mjs'], { cwd: root, encoding: 'utf8' })).toContain('verified README facts')
    const docs = readFileSync(join(root, 'docs/release.md'), 'utf8')
    expect(docs).toContain('965cba0a13d2979551e9f71cdf034dab9e5869af')
    expect(docs).toContain('reviewed merge commit')
  })
})
