import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
const expectedTag = `v${packageJson.version}`
const expectedRef = `refs/tags/${expectedTag}`
if (process.env.GITHUB_REF && process.env.GITHUB_REF !== expectedRef) {
  throw new Error(`release workflow received an unexpected ref; only ${expectedRef} may publish`)
}
if (!process.env.GITHUB_SHA) {
  console.log(`verified release contract for ${expectedTag} (local package check)`)
  process.exit(0)
}

const sha = process.env.GITHUB_SHA
const tagTarget = execFileSync('git', ['rev-list', '-n', '1', `${expectedTag}^{commit}`], { encoding: 'utf8' }).trim()
if (tagTarget !== sha) throw new Error('release tag does not point at GITHUB_SHA')
const tags = execFileSync('git', ['tag', '--points-at', sha], { encoding: 'utf8' }).split('\n').filter(Boolean)
if (tags.length !== 1 || tags[0] !== expectedTag) throw new Error(`GITHUB_SHA is not pointed to exclusively by ${expectedTag}`)

const defaultBranch = process.env.RELEASE_DEFAULT_BRANCH ?? 'main'
const defaultRef = `refs/remotes/origin/${defaultBranch}`
const defaultHead = execFileSync('git', ['rev-parse', defaultRef], { encoding: 'utf8' }).trim()
try {
  execFileSync('git', ['merge-base', '--is-ancestor', sha, defaultHead], { stdio: 'ignore' })
} catch {
  throw new Error('release tag commit is not reachable from the default branch')
}

const repository = process.env.GITHUB_REPOSITORY
const token = process.env.GITHUB_TOKEN
if (!repository || !token) throw new Error('GITHUB_REPOSITORY and GITHUB_TOKEN are required for reviewed-source binding')
const response = await fetch(`https://api.github.com/repos/${repository}/commits/${sha}/pulls`, {
  headers: {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${token}`,
    'X-GitHub-Api-Version': '2022-11-28',
  },
})
if (!response.ok) throw new Error(`GitHub reviewed-source lookup failed with HTTP ${response.status}`)
const pulls = await response.json()
const merged = Array.isArray(pulls) && pulls.some((pull) =>
  pull?.base?.ref === defaultBranch && pull?.merged_at && pull?.merge_commit_sha === sha,
)
if (!merged) throw new Error('release tag commit is not the merge commit of a merged pull request into the default branch')
console.log(`verified ${expectedTag} at reviewed merge commit on ${defaultBranch}`)
