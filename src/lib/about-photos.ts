/**
 * The /about rotation reads photos-api's `about` collection: public kylies.photos
 * photos tagged `kylie`, including ones hidden from every other listing. The nightly
 * sync asks photos-api to add newly tagged photos; photos-api owns the membership.
 */

import { type DisplayPhoto, getAllCollectionPhotos } from './photos-client'
import type { SyncResult } from './types'

export const ABOUT_COLLECTION = 'about'

/** Typed view of photos-api's `PhotoCollections` RPC entrypoint (`src/about-collection.ts`). */
export interface PhotoCollectionsRpc {
  fillAboutCollection(options?: { dryRun?: boolean }): Promise<{ added: string[]; total: number }>
}

/**
 * The collection is a feature, so Link-only photos rotate here too. Membership only grows,
 * so photos later made private or moved off kylies.photos are filtered out.
 */
export function isAboutFeatureVisible(photo: Pick<DisplayPhoto, 'visibility' | 'site'>): boolean {
  return (
    (photo.visibility === 'public' || photo.visibility === 'unlisted') &&
    (photo.site === 'climb-log' || photo.site === 'both')
  )
}

/** Exact, case-insensitive `kylie` tag, matching photos-api's collection rule. */
export function hasAboutTag(tags: string | null): boolean {
  if (!tags) return false
  let list: unknown
  try {
    list = JSON.parse(tags)
  } catch {
    list = tags.split(',')
  }
  return (
    Array.isArray(list) &&
    list.some(tag => typeof tag === 'string' && tag.trim().toLowerCase() === 'kylie')
  )
}

/**
 * The `about` collection, or the photos tagged `kylie` in the general list when the
 * collection is empty or unreachable.
 */
export async function aboutPhotoPool(
  origin: string | undefined,
  fallback: DisplayPhoto[],
  fetchFn?: typeof fetch,
): Promise<DisplayPhoto[]> {
  if (origin) {
    try {
      const collection = await getAllCollectionPhotos(origin, ABOUT_COLLECTION, {
        fetchFn,
        maxPhotos: 500,
      })
      const photos = collection.filter(isAboutFeatureVisible)
      if (photos.length > 0) return photos
    } catch (error) {
      console.error('Failed to load the about collection:', error)
    }
  }
  const tagged = fallback.filter(photo => hasAboutTag(photo.tags))
  return tagged.length > 0 ? tagged : fallback
}

/**
 * Ask photos-api to add newly tagged photos to the `about` collection. Skipped in
 * `astro dev`, whose remote service binding would write to production photos-api.
 */
export async function fillAboutStep(
  rpc: PhotoCollectionsRpc | undefined,
  isDev = import.meta.env.DEV,
): Promise<SyncResult | null> {
  if (isDev) return null
  const base = { table: 'about_photos', inserted: 0, updated: 0, deleted: 0 }
  if (!rpc) return { ...base, errors: ['PHOTO_COLLECTIONS service binding is not configured'] }
  try {
    const { added } = await rpc.fillAboutCollection()
    return { ...base, inserted: added.length, errors: [] }
  } catch (error) {
    return {
      ...base,
      errors: [
        `Failed to fill the about collection: ${error instanceof Error ? error.message : String(error)}`,
      ],
    }
  }
}
