import type { APIRoute } from 'astro'
import { env } from 'cloudflare:workers'

export const prerender = false

export const POST: APIRoute = async ({ request }) => {
  const DB = env.DB as D1Database | undefined
  
  if (!DB) {
    return new Response(JSON.stringify({ error: 'Database not available' }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  try {
    const body = await request.json() as Record<string, unknown>
    const climbId = typeof body.climbId === 'string' ? body.climbId : null
    const photoUrl = typeof body.photoUrl === 'string' ? body.photoUrl : null

    if (!climbId || !photoUrl) {
      return new Response(JSON.stringify({ error: 'Missing or invalid climbId or photoUrl' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Get current URL for audit log
    const current = await DB.prepare(
      'SELECT preview_img_url FROM climbs WHERE id = ?'
    ).bind(climbId).first<{ preview_img_url: string | null }>()
    const previousUrl = current?.preview_img_url || null

    // Update climb
    await DB.prepare(
      'UPDATE climbs SET preview_img_url = ? WHERE id = ?'
    ).bind(photoUrl, climbId).run()

    // Log assignment
    const logResult = await DB.prepare(
      'INSERT INTO photo_assignment_log (climb_id, previous_url, new_url) VALUES (?, ?, ?) RETURNING id'
    ).bind(climbId, previousUrl, photoUrl).first<{ id: number }>()

    return new Response(JSON.stringify({ 
      success: true, 
      assignmentId: logResult?.id,
      previousUrl 
    }), {
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Update failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}
