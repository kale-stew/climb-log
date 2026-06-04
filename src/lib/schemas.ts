/**
 * Zod schemas for API input validation.
 * 
 * These schemas validate incoming request bodies and query parameters
 * to ensure type safety and provide clear error messages.
 */

import { z } from 'zod'

// ============ Photo Schemas ============

/** Schema for updating photo metadata */
export const updatePhotoSchema = z.object({
  title: z.string().max(500).nullable().optional(),
  location: z.string().max(500).nullable().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD format').nullable().optional(),
  tags: z.string().max(2000).nullable().optional(),
  site: z.enum(['climb-log', 'kylieis-online', 'both']).optional(),
  exclude: z.boolean().optional(),
  caption: z.string().max(2000).nullable().optional(),
}).strict()

export type UpdatePhotoInput = z.infer<typeof updatePhotoSchema>

/** Schema for resize request */
export const resizePhotoSchema = z.object({
  photoId: z.string().min(1, 'photoId is required'),
  width: z.coerce.number().int().min(1).max(2048),
})

export type ResizePhotoInput = z.infer<typeof resizePhotoSchema>

/** Schema for extract-colors request */
export const extractColorsSchema = z.object({
  photoId: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
})

export type ExtractColorsInput = z.infer<typeof extractColorsSchema>

/** Schema for photo list query parameters */
export const photoListQuerySchema = z.object({
  site: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
})

export type PhotoListQuery = z.infer<typeof photoListQuerySchema>

// ============ Utility ============

interface ZodIssueLike {
  path: readonly PropertyKey[]
  message: string
}

interface ZodErrorLike {
  issues: readonly ZodIssueLike[]
}

/**
 * Format Zod errors into a user-friendly message.
 * Typed structurally so it works across Zod v3/v4 error shapes.
 *
 * @param error - Zod error object (any version)
 * @returns Formatted error message
 */
export function formatZodError(error: ZodErrorLike): string {
  return error.issues.map(issue => {
    const path = issue.path.length > 0 ? `${issue.path.map(String).join('.')}: ` : ''
    return `${path}${issue.message}`
  }).join('; ')
}
