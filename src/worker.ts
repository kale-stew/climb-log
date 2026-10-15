import { handle } from '@astrojs/cloudflare/handler'
import { addPreviewRobotsHeader } from './lib/response-headers'

export default {
  async fetch(request, env, ctx) {
    return addPreviewRobotsHeader(request, await handle(request, env, ctx))
  },

  async scheduled(_controller, env, ctx) {
    if (!env.CRON_SECRET) {
      throw new Error('CRON_SECRET is required for the scheduled Notion sync')
    }

    ctx.waitUntil(
      handle(
        new Request('https://kylies.photos/api/cron', {
          method: 'POST',
          headers: { Authorization: `Bearer ${env.CRON_SECRET}` },
        }),
        env,
        ctx,
      ).then(response => {
        if (!response.ok) throw new Error(`Notion sync failed with status ${response.status}`)
      }),
    )
  },
} satisfies ExportedHandler<Cloudflare.Env>
