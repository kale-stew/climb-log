import type { APIRoute } from 'astro'

/** Keep old `/shop/` links working after the site switched to slashless URLs. */
export const prerender = false

export const GET: APIRoute = ({ redirect }) => redirect('/shop', 308)
