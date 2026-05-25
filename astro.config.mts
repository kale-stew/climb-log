import { defineConfig } from 'astro/config'
import cloudflare from '@astrojs/cloudflare'
import react from '@astrojs/react'

export default defineConfig({
  output: 'server',
  adapter: cloudflare({
    platformProxy: {
      enabled: true,
    },
  }),
  integrations: [react()],
  vite: {
    resolve: {
      conditions: ['web', 'worker'],
    },
    optimizeDeps: {
      exclude: ['workers-og', '@resvg/resvg-wasm', 'yoga-wasm-web'],
    },
    ssr: {
      external: ['workers-og'],
    },
  },
})
