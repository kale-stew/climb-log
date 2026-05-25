#!/usr/bin/env node
/**
 * Export data from Notion databases to JSON files
 * Run with: npm run export
 */

import { Client } from '@notionhq/client'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'

dotenv.config()

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = path.join(__dirname, '..', 'data')

const notion = new Client({ auth: process.env.NOTION_TOKEN })

// Database IDs from .env
const DATABASES = {
  climbs: process.env.NOTION_CLIMBS_DB_ID,
  peaks: process.env.NOTION_PEAKS_DB_ID,
  gear: process.env.NOTION_GEAR_DB_ID,
  photos: process.env.NOTION_PHOTOS_DB_ID,
}

/**
 * Format a Notion property value to a plain JS value
 */
function fmt(field) {
  if (!field) return null
  switch (field.type) {
    case 'checkbox':
      return field.checkbox
    case 'date':
      return field.date?.start ?? null
    case 'file':
      return field.file?.url ?? null
    case 'files':
      return field.files?.length > 0 ? field.files[0]?.file?.url ?? field.files[0]?.external?.url : null
    case 'formula':
      return field.formula?.string ?? field.formula?.number ?? null
    case 'multi_select':
      return field.multi_select?.length > 0 ? field.multi_select.map(s => s.name) : null
    case 'number':
      return field.number
    case 'rich_text':
      return field.rich_text?.length > 0 ? field.rich_text[0]?.plain_text : null
    case 'select':
      return field.select?.name ?? null
    case 'title':
      return field.title?.[0]?.plain_text ?? null
    case 'url':
      return field.url
    case 'relation':
      return field.relation?.length > 0 ? field.relation.map(r => r.id) : null
    default:
      console.warn(`Unknown field type: ${field.type}`)
      return null
  }
}

/**
 * Query all pages from a Notion database with pagination
 */
async function queryAllPages(databaseId, sorts = []) {
  const results = []
  let cursor = undefined

  do {
    const response = await notion.databases.query({
      database_id: databaseId,
      start_cursor: cursor,
      sorts,
    })
    results.push(...response.results)
    cursor = response.has_more ? response.next_cursor : undefined
  } while (cursor)

  return results
}

/**
 * Build area name from abbreviation
 */
function buildAreaName(area) {
  if (!area) return null
  const abbrevs = {
    NF: 'National Forest',
    NP: 'National Park',
    OS: 'Open Space',
    RA: 'Recreation Area',
    RP: 'Regional Park',
    SP: 'State Park',
    WA: 'Wilderness',
  }
  for (const [abbr, full] of Object.entries(abbrevs)) {
    if (area.includes(abbr)) {
      return area.replace(abbr, full)
    }
  }
  return area
}

/**
 * Parse area string into region and state
 */
function parseArea(areaStr) {
  if (!areaStr) return { region: null, state: null }
  const parts = areaStr.split(', ')
  return {
    region: buildAreaName(parts[0]),
    state: parts[1] ?? null,
  }
}

/**
 * Format climbs data
 */
function formatClimbs(pages) {
  const today = new Date().toISOString().split('T')[0]
  return pages
    .map(page => {
      const props = page.properties
      const area = parseArea(fmt(props.area))
      const date = fmt(props.date)

      // Skip future climbs
      if (date && date > today) return null

      let previewImg = fmt(props.related_img)
      if (!previewImg && page.cover) {
        previewImg = page.cover.file?.url ?? page.cover.external?.url ?? null
      }

      return {
        id: page.id,
        date,
        title: fmt(props.hike_title),
        slug: fmt(props.related_slug) ?? null,
        preview_img_url: previewImg,
        distance: fmt(props.distance),
        gain: fmt(props.gain),
        area: area.region,
        state: area.state,
        strava: fmt(props.strava),
      }
    })
    .filter(Boolean)
    .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))
}

/**
 * Format peaks data
 */
function formatPeaks(pages) {
  return pages
    .map(page => {
      const props = page.properties
      return {
        id: page.id,
        title: fmt(props.peak_name),
        elevation: fmt(props.elevation),
        first_completed: fmt(props.first_completed_on),
        range: props.range?.select?.name ?? null,
        rank: fmt(props.rank),
        img: fmt(props.img_url),
      }
    })
    .sort((a, b) => (b.elevation ?? 0) - (a.elevation ?? 0))
}

/**
 * Format gear data
 */
function formatGear(pages) {
  return pages
    .filter(page => fmt(page.properties.acquired_on)) // Only gear with acquired date
    .map(page => {
      const props = page.properties
      return {
        id: page.id,
        title: fmt(props.title),
        acquired_on: fmt(props.acquired_on),
        brand: fmt(props.brand),
        category: fmt(props.category),
        color: fmt(props.color),
        img: fmt(props.img_slug) ? `${fmt(props.img_slug)}.png` : null,
        more_info: fmt(props.more_info),
        pack_list: fmt(props.pack_list),
        product_str: fmt(props.product),
        retired_on: fmt(props.retired_on),
        url: fmt(props.url),
      }
    })
    .sort((a, b) => (b.acquired_on ?? '').localeCompare(a.acquired_on ?? ''))
}

/**
 * Format photos data
 */
function formatPhotos(pages) {
  return pages
    .map(page => {
      const props = page.properties
      const area = parseArea(fmt(props.area) ?? fmt(props.area_fallback))
      const src = fmt(props.href)
      const title = fmt(props.title)

      return {
        id: page.id,
        title,
        caption: title && area.region ? `${title}. ${area.region}, ${area.state}.` : title,
        src,
        thumbnail: src,
        area: area.region,
        state: area.state,
        date: fmt(props.taken_on),
        width: fmt(props.width),
        height: fmt(props.height),
        search_tags: fmt(props.tags),
        exclude: fmt(props.exclude) ? 1 : 0,
      }
    })
    .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))
}

async function main() {
  console.log('Exporting Notion data...')

  // Ensure data directory exists
  fs.mkdirSync(DATA_DIR, { recursive: true })

  // Export climbs
  console.log('  Fetching climbs...')
  const climbPages = await queryAllPages(DATABASES.climbs, [{ property: 'date', direction: 'descending' }])
  const climbs = formatClimbs(climbPages)
  fs.writeFileSync(path.join(DATA_DIR, 'climbs.json'), JSON.stringify(climbs, null, 2))
  console.log(`    ${climbs.length} climbs exported`)

  // Export peaks
  console.log('  Fetching peaks...')
  const peakPages = await queryAllPages(DATABASES.peaks, [{ property: 'elevation', direction: 'descending' }])
  const peaks = formatPeaks(peakPages)
  fs.writeFileSync(path.join(DATA_DIR, 'peaks.json'), JSON.stringify(peaks, null, 2))
  console.log(`    ${peaks.length} peaks exported`)

  // Export gear
  console.log('  Fetching gear...')
  const gearPages = await queryAllPages(DATABASES.gear, [{ property: 'acquired_on', direction: 'descending' }])
  const gear = formatGear(gearPages)
  fs.writeFileSync(path.join(DATA_DIR, 'gear.json'), JSON.stringify(gear, null, 2))
  console.log(`    ${gear.length} gear items exported`)

  // Export photos
  console.log('  Fetching photos...')
  const photoPages = await queryAllPages(DATABASES.photos, [{ property: 'taken_on', direction: 'descending' }])
  const photos = formatPhotos(photoPages)
  fs.writeFileSync(path.join(DATA_DIR, 'photos.json'), JSON.stringify(photos, null, 2))
  console.log(`    ${photos.length} photos exported`)

  console.log('Export complete!')
}

main().catch(console.error)
