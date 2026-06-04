/**
 * Backfill slugs for peaks and gear tables
 *
 * Run locally:  npx wrangler dev scripts/backfill-slugs.ts --local
 * Then visit:   http://localhost:8787/backfill
 *
 * For remote:   npx wrangler dev scripts/backfill-slugs.ts
 * Then visit:   http://localhost:8787/backfill
 */

interface Env {
  DB: D1Database
}

interface PeakRecord {
  id: string
  name: string | null
  slug: string | null
}

interface GearRecord {
  id: string
  name: string | null
  brand: string | null
  slug: string | null
}

/**
 * Generate a URL-safe slug from a string
 * Examples:
 *   "Longs Peak" -> "longs-peak"
 *   "Mt. Elbert" -> "mt-elbert"
 *   "Garmin InReach Mini" -> "garmin-inreach-mini"
 */
function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/['']/g, '') // Remove apostrophes
    .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric with dashes
    .replace(/^-+|-+$/g, '') // Trim leading/trailing dashes
    .replace(/-+/g, '-') // Collapse multiple dashes
}

/**
 * Generate gear slug from name and brand for uniqueness
 * Examples:
 *   "Garmin", "InReach Mini" -> "garmin-inreach-mini"
 *   null, "InReach Mini" -> "inreach-mini"
 */
function generateGearSlug(brand: string | null, name: string): string {
  const parts = [brand, name].filter(Boolean).join(' ')
  return generateSlug(parts)
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    if (url.pathname !== '/backfill') {
      return new Response(
        'Slug Backfill Script\n\n' +
          'Usage:\n' +
          '  GET /backfill        - Backfill slugs for peaks and gear\n' +
          '  GET /backfill?dry=1  - Dry run (show what would be updated)\n',
        { status: 200, headers: { 'Content-Type': 'text/plain' } },
      )
    }

    const dryRun = url.searchParams.get('dry') === '1'

    try {
      const result = await backfillSlugs(env.DB, dryRun)
      return new Response(JSON.stringify(result, null, 2), {
        headers: { 'Content-Type': 'application/json' },
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      return new Response(JSON.stringify({ error: message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }
  },
}

interface BackfillResult {
  dryRun: boolean
  peaks: {
    total: number
    updated: number
    skipped: number
    errors: string[]
    samples: Array<{ id: string; name: string; slug: string }>
  }
  gear: {
    total: number
    updated: number
    skipped: number
    errors: string[]
    samples: Array<{ id: string; name: string; slug: string }>
  }
}

async function backfillSlugs(db: D1Database, dryRun: boolean): Promise<BackfillResult> {
  const result: BackfillResult = {
    dryRun,
    peaks: { total: 0, updated: 0, skipped: 0, errors: [], samples: [] },
    gear: { total: 0, updated: 0, skipped: 0, errors: [], samples: [] },
  }

  // ============================================================================
  // PEAKS
  // ============================================================================
  const peaks = await db
    .prepare('SELECT id, name, slug FROM peaks WHERE name IS NOT NULL')
    .all<PeakRecord>()

  result.peaks.total = peaks.results.length
  console.log(`Found ${peaks.results.length} peaks`)

  // Track used slugs to detect collisions
  const usedPeakSlugs = new Set<string>()

  for (const peak of peaks.results) {
    if (!peak.name) {
      result.peaks.skipped++
      continue
    }

    // Skip if already has a slug
    if (peak.slug) {
      usedPeakSlugs.add(peak.slug)
      result.peaks.skipped++
      continue
    }

    try {
      const slug = generateSlug(peak.name)

      // Handle collisions by appending a number
      let finalSlug = slug
      let counter = 2
      while (usedPeakSlugs.has(finalSlug)) {
        finalSlug = `${slug}-${counter}`
        counter++
      }
      usedPeakSlugs.add(finalSlug)

      if (!dryRun) {
        await db.prepare('UPDATE peaks SET slug = ? WHERE id = ?').bind(finalSlug, peak.id).run()
      }

      result.peaks.updated++

      // Keep some samples for verification
      if (result.peaks.samples.length < 5) {
        result.peaks.samples.push({ id: peak.id, name: peak.name, slug: finalSlug })
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      result.peaks.errors.push(`Peak ${peak.id} (${peak.name}): ${message}`)
    }
  }

  // ============================================================================
  // GEAR
  // ============================================================================
  const gear = await db
    .prepare('SELECT id, name, brand, slug FROM gear WHERE name IS NOT NULL')
    .all<GearRecord>()

  result.gear.total = gear.results.length
  console.log(`Found ${gear.results.length} gear items`)

  // Track used slugs to detect collisions
  const usedGearSlugs = new Set<string>()

  for (const item of gear.results) {
    if (!item.name) {
      result.gear.skipped++
      continue
    }

    // Skip if already has a slug
    if (item.slug) {
      usedGearSlugs.add(item.slug)
      result.gear.skipped++
      continue
    }

    try {
      const slug = generateGearSlug(item.brand, item.name)

      // Handle collisions by appending a number
      let finalSlug = slug
      let counter = 2
      while (usedGearSlugs.has(finalSlug)) {
        finalSlug = `${slug}-${counter}`
        counter++
      }
      usedGearSlugs.add(finalSlug)

      if (!dryRun) {
        await db.prepare('UPDATE gear SET slug = ? WHERE id = ?').bind(finalSlug, item.id).run()
      }

      result.gear.updated++

      // Keep some samples for verification
      if (result.gear.samples.length < 5) {
        result.gear.samples.push({ id: item.id, name: item.name, slug: finalSlug })
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      result.gear.errors.push(`Gear ${item.id} (${item.name}): ${message}`)
    }
  }

  console.log(`Peaks: ${result.peaks.updated} updated, ${result.peaks.skipped} skipped`)
  console.log(`Gear: ${result.gear.updated} updated, ${result.gear.skipped} skipped`)

  return result
}
