import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

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

const npmCommand = process.env.NPM_CLI ?? 'npm'
const pack = JSON.parse(execFileSync(npmCommand, ['pack', '--ignore-scripts', '--dry-run', '--json'], { encoding: 'utf8' }))[0]
const publishedFiles = Number(/\| \*\*Published files\*\* \| (\d+) entries \|/.exec(readme)?.[1])
if (!Number.isInteger(publishedFiles) || publishedFiles !== pack.files.length) {
  throw new Error(`README published file count ${publishedFiles} does not match npm pack count ${pack.files.length}`)
}
console.log(`verified README facts for ${packageJson.name}@${packageJson.version} (${pack.files.length} published files)`)
