/**
 * Parse gear URLs to extract retailer information
 *
 * Run locally:  npx wrangler dev scripts/parse-gear-retailers.ts --local
 * Then visit:   http://localhost:8787/backfill
 *
 * For remote:   npx wrangler dev scripts/parse-gear-retailers.ts
 * Then visit:   http://localhost:8787/backfill
 */

interface Env {
  DB: D1Database
}

interface GearRecord {
  id: string
  name: string | null
  url: string | null
  retailer: string | null
  url_parsed_at: string | null
}

/**
 * Known retailers mapped from URL hostname to display name and metadata
 *
 * Trust levels:
 * - high: Primary recommendation, trusted for quality and returns
 * - medium: Good option, reputable retailer
 * - exclude: Never recommend (e.g., Amazon)
 */
const KNOWN_RETAILERS: Record<
  string,
  {
    name: string
    type: 'retail' | 'direct' | 'marketplace'
    trust: 'high' | 'medium' | 'exclude'
  }
> = {
  // Major outdoor retailers (high trust)
  'rei.com': { name: 'REI', type: 'retail', trust: 'high' },
  'www.rei.com': { name: 'REI', type: 'retail', trust: 'high' },

  // Direct from manufacturers (high trust)
  'arcteryx.com': { name: "Arc'teryx", type: 'direct', trust: 'high' },
  'www.arcteryx.com': { name: "Arc'teryx", type: 'direct', trust: 'high' },
  'patagonia.com': { name: 'Patagonia', type: 'direct', trust: 'high' },
  'www.patagonia.com': { name: 'Patagonia', type: 'direct', trust: 'high' },
  'blackdiamondequipment.com': { name: 'Black Diamond', type: 'direct', trust: 'high' },
  'www.blackdiamondequipment.com': { name: 'Black Diamond', type: 'direct', trust: 'high' },
  'garmin.com': { name: 'Garmin', type: 'direct', trust: 'high' },
  'www.garmin.com': { name: 'Garmin', type: 'direct', trust: 'high' },
  'osprey.com': { name: 'Osprey', type: 'direct', trust: 'high' },
  'www.osprey.com': { name: 'Osprey', type: 'direct', trust: 'high' },
  'salomonrunning.com': { name: 'Salomon', type: 'direct', trust: 'high' },
  'www.salomon.com': { name: 'Salomon', type: 'direct', trust: 'high' },
  'mammut.com': { name: 'Mammut', type: 'direct', trust: 'high' },
  'www.mammut.com': { name: 'Mammut', type: 'direct', trust: 'high' },
  'marmot.com': { name: 'Marmot', type: 'direct', trust: 'high' },
  'www.marmot.com': { name: 'Marmot', type: 'direct', trust: 'high' },
  'mountainhardwear.com': { name: 'Mountain Hardwear', type: 'direct', trust: 'high' },
  'www.mountainhardwear.com': { name: 'Mountain Hardwear', type: 'direct', trust: 'high' },
  'thenorthface.com': { name: 'The North Face', type: 'direct', trust: 'high' },
  'www.thenorthface.com': { name: 'The North Face', type: 'direct', trust: 'high' },
  'enlightenedequipment.com': { name: 'Enlightened Equipment', type: 'direct', trust: 'high' },
  'www.enlightenedequipment.com': { name: 'Enlightened Equipment', type: 'direct', trust: 'high' },
  'gossamergear.com': { name: 'Gossamer Gear', type: 'direct', trust: 'high' },
  'www.gossamergear.com': { name: 'Gossamer Gear', type: 'direct', trust: 'high' },
  'zpacks.com': { name: 'Zpacks', type: 'direct', trust: 'high' },
  'www.zpacks.com': { name: 'Zpacks', type: 'direct', trust: 'high' },
  'hyperlitemountaingear.com': { name: 'Hyperlite Mountain Gear', type: 'direct', trust: 'high' },
  'www.hyperlitemountaingear.com': {
    name: 'Hyperlite Mountain Gear',
    type: 'direct',
    trust: 'high',
  },
  'leki.com': { name: 'Leki', type: 'direct', trust: 'high' },
  'www.leki.com': { name: 'Leki', type: 'direct', trust: 'high' },
  'jetboil.com': { name: 'Jetboil', type: 'direct', trust: 'high' },
  'www.jetboil.com': { name: 'Jetboil', type: 'direct', trust: 'high' },
  'msrgear.com': { name: 'MSR', type: 'direct', trust: 'high' },
  'www.msrgear.com': { name: 'MSR', type: 'direct', trust: 'high' },
  'bigagnes.com': { name: 'Big Agnes', type: 'direct', trust: 'high' },
  'www.bigagnes.com': { name: 'Big Agnes', type: 'direct', trust: 'high' },
  'nemoequipment.com': { name: 'NEMO', type: 'direct', trust: 'high' },
  'www.nemoequipment.com': { name: 'NEMO', type: 'direct', trust: 'high' },
  'thermarest.com': { name: 'Therm-a-Rest', type: 'direct', trust: 'high' },
  'www.thermarest.com': { name: 'Therm-a-Rest', type: 'direct', trust: 'high' },
  'alderapparel.com': { name: 'Alder Apparel', type: 'direct', trust: 'high' },
  'www.alderapparel.com': { name: 'Alder Apparel', type: 'direct', trust: 'high' },

  // Other outdoor retailers (medium trust)
  'backcountry.com': { name: 'Backcountry', type: 'retail', trust: 'medium' },
  'www.backcountry.com': { name: 'Backcountry', type: 'retail', trust: 'medium' },
  'moosejaw.com': { name: 'Moosejaw', type: 'retail', trust: 'medium' },
  'www.moosejaw.com': { name: 'Moosejaw', type: 'retail', trust: 'medium' },
  'evo.com': { name: 'evo', type: 'retail', trust: 'medium' },
  'www.evo.com': { name: 'evo', type: 'retail', trust: 'medium' },
  'sierratradingpost.com': { name: 'Sierra', type: 'retail', trust: 'medium' },
  'www.sierra.com': { name: 'Sierra', type: 'retail', trust: 'medium' },
  'campsaver.com': { name: 'CampSaver', type: 'retail', trust: 'medium' },
  'www.campsaver.com': { name: 'CampSaver', type: 'retail', trust: 'medium' },

  // Exclude - never recommend
  'amazon.com': { name: 'Amazon', type: 'marketplace', trust: 'exclude' },
  'www.amazon.com': { name: 'Amazon', type: 'marketplace', trust: 'exclude' },
  'smile.amazon.com': { name: 'Amazon', type: 'marketplace', trust: 'exclude' },
}

/**
 * Parse a URL to extract the retailer name
 * Returns null if URL is invalid or retailer is unknown
 */
function parseRetailer(url: string): string | null {
  try {
    const parsed = new URL(url)
    const hostname = parsed.hostname.toLowerCase()

    // Check direct match
    if (KNOWN_RETAILERS[hostname]) {
      return KNOWN_RETAILERS[hostname].name
    }

    // Try without www prefix
    const withoutWww = hostname.replace(/^www\./, '')
    if (KNOWN_RETAILERS[withoutWww]) {
      return KNOWN_RETAILERS[withoutWww].name
    }

    // Try with www prefix
    const withWww = 'www.' + withoutWww
    if (KNOWN_RETAILERS[withWww]) {
      return KNOWN_RETAILERS[withWww].name
    }

    // Unknown retailer - extract domain name as fallback
    // e.g., "example-gear.com" -> "Example Gear"
    const domain = withoutWww.split('.')[0]
    if (domain) {
      return domain
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
    }

    return null
  } catch {
    return null
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    if (url.pathname !== '/backfill') {
      return new Response(
        'Gear Retailer Parser\n\n' +
          'Usage:\n' +
          '  GET /backfill        - Parse retailer from gear URLs\n' +
          '  GET /backfill?dry=1  - Dry run (show what would be updated)\n' +
          '  GET /backfill?force=1 - Re-parse already-parsed URLs\n',
        { status: 200, headers: { 'Content-Type': 'text/plain' } },
      )
    }

    const dryRun = url.searchParams.get('dry') === '1'
    const force = url.searchParams.get('force') === '1'

    try {
      const result = await parseGearRetailers(env.DB, dryRun, force)
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

interface ParseResult {
  dryRun: boolean
  force: boolean
  total: number
  parsed: number
  skipped: number
  noUrl: number
  errors: string[]
  samples: Array<{ id: string; name: string; url: string; retailer: string }>
  retailers: Record<string, number>
}

async function parseGearRetailers(
  db: D1Database,
  dryRun: boolean,
  force: boolean,
): Promise<ParseResult> {
  const result: ParseResult = {
    dryRun,
    force,
    total: 0,
    parsed: 0,
    skipped: 0,
    noUrl: 0,
    errors: [],
    samples: [],
    retailers: {},
  }

  // Get all gear items
  const query = force
    ? 'SELECT id, name, url, retailer, url_parsed_at FROM gear'
    : 'SELECT id, name, url, retailer, url_parsed_at FROM gear WHERE url_parsed_at IS NULL'

  const gear = await db.prepare(query).all<GearRecord>()
  result.total = gear.results.length
  console.log(`Found ${gear.results.length} gear items to process`)

  const now = new Date().toISOString()

  for (const item of gear.results) {
    // Skip items without URLs
    if (!item.url) {
      result.noUrl++
      continue
    }

    // Skip already-parsed items (unless force)
    if (!force && item.url_parsed_at) {
      result.skipped++
      continue
    }

    try {
      const retailer = parseRetailer(item.url)

      if (!retailer) {
        result.errors.push(`Gear ${item.id} (${item.name}): Could not parse URL ${item.url}`)
        continue
      }

      // Track retailer counts
      result.retailers[retailer] = (result.retailers[retailer] || 0) + 1

      if (!dryRun) {
        await db
          .prepare('UPDATE gear SET retailer = ?, url_parsed_at = ? WHERE id = ?')
          .bind(retailer, now, item.id)
          .run()
      }

      result.parsed++

      // Keep some samples for verification
      if (result.samples.length < 10) {
        result.samples.push({
          id: item.id,
          name: item.name || 'Unknown',
          url: item.url,
          retailer,
        })
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      result.errors.push(`Gear ${item.id} (${item.name}): ${message}`)
    }
  }

  console.log(`Parsed: ${result.parsed}, Skipped: ${result.skipped}, No URL: ${result.noUrl}`)
  console.log('Retailers:', result.retailers)

  return result
}
