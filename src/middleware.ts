import { defineMiddleware } from 'astro:middleware'

/**
 * Middleware to protect admin routes.
 * 
 * Admin routes require either:
 * - Cf-Access-Jwt-Assertion header (from Cloudflare Access)
 * - Authorization: Bearer <CRON_SECRET> header
 * 
 * This matches the auth pattern used in utils/photos-api.ts
 */
export const onRequest = defineMiddleware(async (ctx, next) => {
  const { pathname } = ctx.url
  
  // Protect /admin/* pages and /api/admin/* routes
  if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
    const jwt = ctx.request.headers.get('Cf-Access-Jwt-Assertion')
    const authHeader = ctx.request.headers.get('Authorization')
    const cronSecret = import.meta.env.CRON_SECRET
    
    // Check for Cloudflare Access JWT
    if (jwt) {
      return next()
    }
    
    // Check for Bearer token matching CRON_SECRET
    if (authHeader && cronSecret) {
      const [scheme, token] = authHeader.split(' ')
      if (scheme === 'Bearer' && token === cronSecret) {
        return next()
      }
    }
    
    // For API routes, return JSON error
    if (pathname.startsWith('/api/')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      })
    }
    
    // For page routes, return HTML error
    return new Response('Unauthorized - Cloudflare Access required', {
      status: 401,
      headers: { 'Content-Type': 'text/plain' }
    })
  }
  
  return next()
})
