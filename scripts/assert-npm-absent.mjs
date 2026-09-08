import { spawnSync } from 'node:child_process'

const spec = process.argv[2] ?? '@aihu/seo@1.0.6'
const npmCommand = process.env.NPM_CLI ?? 'npm'
const result = spawnSync(npmCommand, ['view', spec, 'version', '--json'], { encoding: 'utf8' })
const output = `${result.stdout ?? ''}\n${result.stderr ?? ''}`
if (result.status === 0) throw new Error(`${spec} already exists on npm; refusing to publish over it`)
if (!/E404|No match found for version/i.test(output)) {
  throw new Error(`npm absence check did not fail closed with E404 for ${spec}:\n${output}`)
}
const errorCodes = [...output.matchAll(/(?:npm )?error code (E\d+)/gi)].map((match) => match[1].toUpperCase())
if (errorCodes.some((code) => code !== 'E404') || /ECONN|ETIMEDOUT|ENETUNREACH|EAI_AGAIN/i.test(output)) {
  throw new Error(`npm absence check also reported a non-E404 failure for ${spec}:\n${output}`)
}
console.log(`confirmed E404-only absence for ${spec}`)
