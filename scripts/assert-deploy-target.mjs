// Refuse to deploy unless the Astro-generated Wrangler config targets the expected Worker.
// The Cloudflare Vite plugin picks the environment from CLOUDFLARE_ENV at build time and
// `wrangler deploy --env` is ignored for the generated config, so a missing variable would
// otherwise deploy a preview build to the production Worker.
import { readFileSync } from 'node:fs'

const expected = process.argv[2]
if (!expected) {
  console.error('Usage: node scripts/assert-deploy-target.mjs <worker-name>')
  process.exit(2)
}

const config = JSON.parse(readFileSync('dist/server/wrangler.json', 'utf8'))
if (config.name !== expected) {
  console.error(`Refusing to deploy: build targets "${config.name}", expected "${expected}".`)
  process.exit(1)
}

console.log(`Deploy target verified: ${config.name}`)
