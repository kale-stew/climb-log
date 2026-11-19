import cloudflare from '@astrojs/cloudflare'
import react from '@astrojs/react'
import { defineConfig } from 'astro/config'
import { rehypeBlogFigures } from './src/lib/blog-figures'

const PHOTOS_API_ORIGIN = process.env.PHOTOS_API_ORIGIN ?? 'https://photos-api.kylieski.workers.dev'

export default defineConfig({
  output: 'server',
  markdown: {
    rehypePlugins: [[rehypeBlogFigures, { origin: PHOTOS_API_ORIGIN }]],
  },
  trailingSlash: 'never',
  // Older posts linked gear posts under /gear; they live under /blog/gear.
  redirects: {
    '/gear/14er-pack-list': '/blog/gear/14er-pack-list',
    '/gear/first-winter-peak': '/blog/gear/first-winter-peak',
    '/gear/car-camping': '/blog/gear/car-camping',
  },
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
