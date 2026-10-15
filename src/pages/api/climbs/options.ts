import type { APIRoute } from 'astro'
import { env } from 'cloudflare:workers'

export const prerender = false

export const GET: APIRoute = async () => {
  const result = await env.DB.prepare(`
    SELECT id, title, date, area, state
    FROM climbs
    ORDER BY date DESC, title ASC
  `).all()

  return Response.json(
    { climbs: result.results || [] },
    { headers: { 'Cache-Control': 'public, max-age=60, s-maxage=300' } },
  )
}
