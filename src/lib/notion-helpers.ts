/**
 * Pure helpers for parsing Notion data during sync.
 *
 * These functions have no Cloudflare/Workers dependencies so they can be
 * imported by both the cron sync (`src/pages/api/cron.ts`) and unit tests.
 */

/**
 * Extract a typed property value from a Notion page.
 */
export function getNotionProp(
  page: Record<string, unknown>,
  name: string,
  type: string
): unknown {
  const properties = page.properties as Record<string, Record<string, unknown>> | undefined
  if (!properties) return null

  const prop = properties[name]
  if (!prop) return null

  switch (type) {
    case 'title': {
      const titleArray = prop.title as Array<{ plain_text?: string }> | undefined
      return titleArray?.[0]?.plain_text || null
    }
    case 'rich_text': {
      const textArray = prop.rich_text as Array<{ plain_text?: string }> | undefined
      return textArray?.[0]?.plain_text || null
    }
    case 'number':
      return prop.number ?? null
    case 'date': {
      const dateObj = prop.date as { start?: string } | null
      return dateObj?.start || null
    }
    case 'select': {
      const selectObj = prop.select as { name?: string } | null
      return selectObj?.name || null
    }
    case 'multi_select': {
      const multiSelect = prop.multi_select as Array<{ name?: string }> | undefined
      return multiSelect?.map(s => s.name).filter(Boolean) || []
    }
    case 'url':
      return prop.url || null
    case 'checkbox':
      return prop.checkbox ?? false
    case 'files': {
      const files = prop.files as
        | Array<{ file?: { url?: string }; external?: { url?: string } }>
        | undefined
      return files?.[0]?.file?.url || files?.[0]?.external?.url || null
    }
    default:
      return null
  }
}

/**
 * Parse `area_fallback` into `area` and `state`.
 *
 * Supported formats:
 * - "Area Name, State"
 * - "Area Name - State"
 * - "Area Name- State"
 *
 * Internal hyphens in area names (e.g. "Bridger-Teton") are preserved: only a
 * dash that is adjacent to whitespace is treated as the area/state separator.
 */
export function parseAreaFallback(
  areaFallback: string | null
): { area: string | null; state: string | null } {
  if (!areaFallback) {
    return { area: null, state: null }
  }

  let area: string | null = null
  let state: string | null = null

  if (areaFallback.includes(',')) {
    const parts = areaFallback.split(',').map(s => s.trim())
    area = parts[0] || null
    state = normalizeStateName(parts[1]) || null
  } else if (/\s-|-\s/.test(areaFallback)) {
    // Split on a whitespace-adjacent dash so "Bridger-Teton - Wyoming"
    // yields area="Bridger-Teton", state="Wyoming".
    const parts = areaFallback.split(/\s*-\s+|\s+-\s*/).map(s => s.trim())
    area = parts[0] || null
    state = normalizeStateName(parts[1]) || null
  } else {
    area = areaFallback
  }

  // Normalize internal spacing around hyphens (e.g. "Bridger - Teton" -> "Bridger-Teton").
  if (area) {
    area = area.replace(/\s*-\s*/g, '-').trim()
  }

  return { area, state }
}

/**
 * Parse a comma-separated tag string into a normalized, deduplicated,
 * alphabetically sorted comma-separated string. Returns null when empty.
 */
export function parseTags(tagsRaw: string | null): string | null {
  if (!tagsRaw) return null

  const tags = tagsRaw
    .split(',')
    .map(t => t.trim().toLowerCase())
    .filter(t => t.length > 0)
  const uniqueTags = Array.from(new Set(tags)).sort()
  return uniqueTags.length > 0 ? uniqueTags.join(', ') : null
}

/**
 * Normalize state names/abbreviations to full state names.
 * Unknown values pass through trimmed.
 */
export function normalizeStateName(state: string | null | undefined): string | null {
  if (!state) return null

  const stateMap: Record<string, string> = {
    AZ: 'Arizona',
    CA: 'California',
    CO: 'Colorado',
    ID: 'Idaho',
    MT: 'Montana',
    NM: 'New Mexico',
    NV: 'Nevada',
    OR: 'Oregon',
    UT: 'Utah',
    WA: 'Washington',
    WY: 'Wyoming',
    Alaska: 'Alaska',
    'Washington State': 'Washington',
  }

  const trimmed = state.trim()
  return stateMap[trimmed] || trimmed
}
