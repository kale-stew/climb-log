/**
 * Seed D1 database from exported JSON files
 * Run with: npx wrangler d1 execute climb-log-db --local --file=db/seed.sql
 * Or use this script with wrangler's --command option
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = path.join(__dirname, '..', 'data')

interface Climb {
  id: string
  date: string | null
  title: string
  slug: string | null
  preview_img_url: string | null
  distance: number | null
  gain: number | null
  area: string | null
  state: string | null
  strava: string | null
}

interface Peak {
  id: string
  title: string
  elevation: number
  first_completed: string | null
  range: string | null
  rank: number | null
  img: string | null
}

interface Gear {
  id: string
  title: string
  acquired_on: string | null
  brand: string | null
  category: string | null
  color: string | null
  img: string | null
  more_info: string | null
  pack_list: string | null
  product_str: string | null
  retired_on: string | null
  url: string | null
}

interface Photo {
  id: string
  title: string | null
  caption: string | null
  src: string
  thumbnail: string | null
  area: string | null
  state: string | null
  date: string | null
  width: number | null
  height: number | null
  search_tags: string | null
  exclude: number
}

function escapeSQL(value: unknown): string {
  if (value === null || value === undefined) return 'NULL'
  if (typeof value === 'number') return String(value)
  if (typeof value === 'boolean') return value ? '1' : '0'
  return `'${String(value).replace(/'/g, "''")}'`
}

function generateInsertSQL<T extends Record<string, unknown>>(
  table: string,
  data: T[],
  columns: (keyof T)[]
): string {
  if (data.length === 0) return ''

  const statements = data.map(row => {
    const values = columns.map(col => escapeSQL(row[col])).join(', ')
    return `INSERT OR REPLACE INTO ${table} (${columns.join(', ')}) VALUES (${values});`
  })

  return statements.join('\n')
}

async function main() {
  console.log('Generating seed SQL...')

  // Read data files
  const climbs: Climb[] = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'climbs.json'), 'utf8'))
  const peaks: Peak[] = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'peaks.json'), 'utf8'))
  const gear: Gear[] = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'gear.json'), 'utf8'))
  const photos: Photo[] = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'photos.json'), 'utf8'))

  let sql = '-- Auto-generated seed SQL\n'
  sql += `-- Generated at: ${new Date().toISOString()}\n\n`

  // Climbs
  sql += '-- Climbs\n'
  sql += generateInsertSQL('climbs', climbs, [
    'id', 'date', 'title', 'slug', 'preview_img_url', 'distance', 'gain', 'area', 'state', 'strava'
  ])
  sql += '\n\n'

  // Peaks
  sql += '-- Peaks\n'
  sql += generateInsertSQL('peaks', peaks, [
    'id', 'title', 'elevation', 'first_completed', 'range', 'rank', 'img'
  ])
  sql += '\n\n'

  // Gear
  sql += '-- Gear\n'
  sql += generateInsertSQL('gear', gear, [
    'id', 'title', 'acquired_on', 'brand', 'category', 'color', 'img', 'more_info', 'pack_list', 'product_str', 'retired_on', 'url'
  ])
  sql += '\n\n'

  // Photos — include r2_key and short_id to match production schema
  const photosWithKeys = photos.map(p => ({
    ...p,
    r2_key: `photos/${p.id}`,
    short_id: Array.from({ length: 8 }, () => Math.floor(Math.random() * 16).toString(16)).join('')
  }))
  sql += '-- Photos\n'
  sql += generateInsertSQL('photos', photosWithKeys, [
    'id', 'title', 'caption', 'src', 'thumbnail', 'area', 'state', 'date', 'width', 'height', 'search_tags', 'exclude', 'r2_key', 'short_id'
  ])

  // Write SQL file
  const sqlPath = path.join(__dirname, 'seed.sql')
  fs.writeFileSync(sqlPath, sql)
  console.log(`Seed SQL written to ${sqlPath}`)
  console.log(`  ${climbs.length} climbs`)
  console.log(`  ${peaks.length} peaks`)
  console.log(`  ${gear.length} gear items`)
  console.log(`  ${photos.length} photos`)
}

main().catch(console.error)
