import { readFileSync } from 'node:fs'
import { EXPECTED_PACKAGE_FILES, EXPECTED_TARBALL_FILES } from './release-files.mjs'

const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
const manifest = JSON.parse(readFileSync(new URL('../install-manifest.json', import.meta.url), 'utf8'))
const readme = readFileSync(new URL('../README.md', import.meta.url), 'utf8')

function requireText(text, description) {
  if (!readme.includes(text)) throw new Error(`README package fact is stale: ${description}`)
}

requireText(`@aihu/seo@${packageJson.version}`, 'version marker')
requireText(`| **Version** | \`${packageJson.version}\` |`, 'version table')
if (manifest.pluginName !== packageJson.name || manifest.pluginVersion !== packageJson.version) {
  throw new Error('install-manifest package identity or version is stale')
}
for (const [name, range] of Object.entries(packageJson.dependencies ?? {})) {
  requireText(`- \`${name}\` — \`${range}\``, `dependency ${name}`)
}
const exportConfig = packageJson.exports?.['.']
if (exportConfig?.import) requireText(`| \`.\` | \`${exportConfig.import}\` |`, 'import export')

const publishedFiles = Number(/\| \*\*Published files\*\* \| (\d+) entries \|/.exec(readme)?.[1])
if (!Number.isInteger(publishedFiles) || publishedFiles !== EXPECTED_TARBALL_FILES.length) {
  throw new Error(`README published file count ${publishedFiles} does not match release allowlist count ${EXPECTED_TARBALL_FILES.length}`)
}
if (JSON.stringify(packageJson.files) !== JSON.stringify(EXPECTED_PACKAGE_FILES)) {
  throw new Error(`package files changed without updating the release contract: ${JSON.stringify(packageJson.files)}`)
}
console.log(`verified README facts for ${packageJson.name}@${packageJson.version} (${EXPECTED_TARBALL_FILES.length} published files)`)
