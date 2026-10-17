import cloudflare from '@astrojs/cloudflare'
import react from '@astrojs/react'
import { defineConfig } from 'astro/config'

export default defineConfig({
  output: 'server',
  trailingSlash: 'never',
  adapter: cloudflare(),
  integrations: [react()],
  vite: {
    resolve: {
      conditions: ['web', 'worker'],
    },
    optimizeDeps: {
      exclude: [
        'workers-og',
        '@resvg/resvg-wasm',
        'yoga-wasm-web',
        'hono',
        '@hono/zod-validator',
        'zod',
      ],
    },
    ssr: {
      external: ['workers-og'],
    },
  },
})
