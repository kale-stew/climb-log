// Readable, title-only photo URLs: /photos/{slug}.
//
// photos-api owns photo metadata; climb-log owns its URL space in `photo_slugs`.
// A slug is never reassigned to another photo. When a title changes, the photo
// gets a new current slug and its older slugs redirect to it, so every link
// ever published keeps working. Duplicate titles take the photo's year, then a
// counter: tunnel-view, tunnel-view-2019, tunnel-view-2019-2.

export interface SluggablePhoto {
  id: string
  title: string | null
  date: string | null
}

export interface SlugMatch {
  photoId: string
  /** The photo's current slug; equal to the requested slug unless it is an old one. */
  currentSlug: string
}

const MAX_SLUG_LENGTH = 80
const MAX_ATTEMPTS = 50
const FALLBACK_BASE = 'photo'

export function slugify(title: string | null | undefined): string {
  if (!title) return ''
  const slug = title
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[\u02bb\u02bc\u2018\u2019'`]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  if (slug.length <= MAX_SLUG_LENGTH) return slug
  const cut = slug.slice(0, MAX_SLUG_LENGTH)
  const lastHyphen = cut.lastIndexOf('-')
  return (lastHyphen > 20 ? cut.slice(0, lastHyphen) : cut).replace(/-+$/, '')
}

export function isSlugShaped(value: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) && value.length <= MAX_SLUG_LENGTH + 16
}

/** Candidate slugs in preference order for a base and the photo's capture year. */
export function candidateSlugs(base: string, date: string | null): string[] {
  const year = date?.match(/^(\d{4})/)?.[1]
  const candidates = [base]
  if (year) candidates.push(`${base}-${year}`)
  const stem = year ? `${base}-${year}` : base
  for (let counter = 2; candidates.length < MAX_ATTEMPTS; counter++)
    candidates.push(`${stem}-${counter}`)
  return candidates
}

export async function resolveSlug(db: D1Database, slug: string): Promise<SlugMatch | null> {
  const row = await db
    .prepare(
      `SELECT s.photo_id AS photoId, COALESCE(c.slug, s.slug) AS currentSlug
       FROM photo_slugs s
       LEFT JOIN photo_slugs c ON c.photo_id = s.photo_id AND c.is_current = 1
       WHERE s.slug = ?`,
    )
    .bind(slug)
    .first<SlugMatch>()
  return row ?? null
}

export async function currentSlugs(
  db: D1Database,
  photoIds: string[],
): Promise<Map<string, string>> {
  const slugs = new Map<string, string>()
  for (let offset = 0; offset < photoIds.length; offset += 90) {
    const chunk = photoIds.slice(offset, offset + 90)
    if (chunk.length === 0) continue
    const { results } = await db
      .prepare(
        `SELECT photo_id AS photoId, slug FROM photo_slugs WHERE is_current = 1 AND photo_id IN (${chunk.map(() => '?').join(', ')})`,
      )
      .bind(...chunk)
      .all<{ photoId: string; slug: string }>()
    for (const row of results) slugs.set(row.photoId, row.slug)
  }
  return slugs
}

/**
 * Return the photo's current slug, issuing one when the photo has none or its
 * title no longer matches. Safe to call concurrently: slugs are primary keys
 * and each attempt is a single transactional batch.
 */
export async function ensurePhotoSlug(db: D1Database, photo: SluggablePhoto): Promise<string> {
  const base = slugify(photo.title) || FALLBACK_BASE
  const { results: existing } = await db
    .prepare(
      'SELECT slug, base, is_current AS isCurrent FROM photo_slugs WHERE photo_id = ? ORDER BY created_at DESC',
    )
    .bind(photo.id)
    .all<{ slug: string; base: string; isCurrent: number }>()

  const current = existing.find(row => row.isCurrent === 1)
  if (current && current.base === base) return current.slug

  // A title changed back: reuse the slug this photo already had for it.
  const previous = existing.find(row => row.isCurrent === 0 && row.base === base)
  if (previous) {
    await db.batch([
      db
        .prepare('UPDATE photo_slugs SET is_current = 0 WHERE photo_id = ? AND is_current = 1')
        .bind(photo.id),
      db.prepare('UPDATE photo_slugs SET is_current = 1 WHERE slug = ?').bind(previous.slug),
    ])
    return previous.slug
  }

  for (const candidate of candidateSlugs(base, photo.date)) {
    try {
      await db.batch([
        db
          .prepare('UPDATE photo_slugs SET is_current = 0 WHERE photo_id = ? AND is_current = 1')
          .bind(photo.id),
        db
          .prepare('INSERT INTO photo_slugs (slug, photo_id, base, is_current) VALUES (?, ?, ?, 1)')
          .bind(candidate, photo.id, base),
      ])
      return candidate
    } catch (error) {
      if (!isConstraintError(error)) throw error
      // A concurrent request may have just issued this photo's slug.
      const winner = await db
        .prepare('SELECT slug, base FROM photo_slugs WHERE photo_id = ? AND is_current = 1')
        .bind(photo.id)
        .first<{ slug: string; base: string }>()
      if (winner?.base === base) return winner.slug
    }
  }
  throw new Error(`No free slug for photo ${photo.id} after ${MAX_ATTEMPTS} attempts`)
}

function isConstraintError(error: unknown): boolean {
  return error instanceof Error && /UNIQUE|constraint/i.test(error.message)
}

export interface SlugSyncResult {
  checked: number
  issued: number
  errors: string[]
}

/** Give every listed photo a current slug that matches its title. */
export async function syncPhotoSlugs(
  db: D1Database,
  photos: SluggablePhoto[],
): Promise<SlugSyncResult> {
  const before = await currentSlugs(
    db,
    photos.map(photo => photo.id),
  )
  const result: SlugSyncResult = { checked: photos.length, issued: 0, errors: [] }
  // Oldest photos first, so the earliest photo with a shared title keeps the plain slug.
  const ordered = [...photos].sort(
    (a, b) => (a.date ?? '9999').localeCompare(b.date ?? '9999') || a.id.localeCompare(b.id),
  )
  for (const photo of ordered) {
    try {
      const slug = await ensurePhotoSlug(db, photo)
      if (before.get(photo.id) !== slug) result.issued++
    } catch (error) {
      result.errors.push(`${photo.id}: ${error instanceof Error ? error.message : String(error)}`)
    }
  }
  return result
}
