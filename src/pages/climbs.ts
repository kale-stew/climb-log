import type { APIRoute } from 'astro'

export const prerender = false

// The journal moved from /climbs to /journal. Keep old links, including
// ?outing= and ?page= deep links, working with a permanent redirect.
export const GET: APIRoute = ({ url, redirect }) => redirect(`/journal${url.search}`, 301)
