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

// ============ Cron/Sync Schemas ============

/** Schema for manual cron trigger */
export const cronTriggerSchema = z.object({
  secret: z.string().min(1, 'Secret is required'),
})

// ============ Utility ============

/**
 * Parse and validate input against a schema.
 * Returns the validated data or throws a validation error.
 * 
 * @param schema - Zod schema to validate against
 * @param data - Data to validate
 * @returns Validated and typed data
 */
export function parseOrThrow<T>(schema: z.ZodSchema<T>, data: unknown): T {
  return schema.parse(data)
}

/**
 * Safely parse input against a schema.
 * Returns a result object with success/error state.
 * 
 * @param schema - Zod schema to validate against
 * @param data - Data to validate
 * @returns SafeParseReturnType with data or error
 */
export function safeParse<T>(schema: z.ZodSchema<T>, data: unknown) {
  return schema.safeParse(data)
}

interface ZodIssue {
  path: readonly (string | number)[]
  message: string
}

interface ZodErrorLike {
  issues: readonly ZodIssue[]
}

/**
 * Format Zod errors into a user-friendly message.
 * Works with both Zod v3 and v4 error types.
 * 
 * @param error - Zod error object (any version)
 * @returns Formatted error message
 */
export function formatZodError(error: ZodErrorLike): string {
  return error.issues.map(issue => {
    const path = issue.path.length > 0 ? `${issue.path.join('.')}: ` : ''
    return `${path}${issue.message}`
  }).join('; ')
}
