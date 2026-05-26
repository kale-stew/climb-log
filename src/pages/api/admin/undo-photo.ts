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
    const assignmentId = typeof body.assignmentId === 'number' ? body.assignmentId : 
                         typeof body.assignmentId === 'string' ? parseInt(body.assignmentId, 10) : null

    if (!assignmentId || isNaN(assignmentId)) {
      return new Response(JSON.stringify({ error: 'Missing or invalid assignmentId' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Get the assignment record
    const assignment = await DB.prepare(
      'SELECT climb_id, previous_url FROM photo_assignment_log WHERE id = ?'
    ).bind(assignmentId).first<{ climb_id: string; previous_url: string | null }>()

    if (!assignment) {
      return new Response(JSON.stringify({ error: 'Assignment not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Revert to previous URL (or NULL if there was none)
    await DB.prepare(
      'UPDATE climbs SET preview_img_url = ? WHERE id = ?'
    ).bind(assignment.previous_url, assignment.climb_id).run()

    // Delete the assignment log so it can't be undone twice
    await DB.prepare(
      'DELETE FROM photo_assignment_log WHERE id = ?'
    ).bind(assignmentId).run()

    return new Response(JSON.stringify({ 
      success: true,
      climbId: assignment.climb_id,
      revertedTo: assignment.previous_url 
    }), {
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Undo failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}
