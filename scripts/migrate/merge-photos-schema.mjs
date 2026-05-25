#!/usr/bin/env node
/**
 * Merge photos-api data into climb-log-db
 *
 * Steps:
 * 1. Export photos-db to a local JSON file
 * 2. Read current climb-log-db photos table
 * 3. Update each row with r2_key, format, site, etc.
 * 4. For rows that exist in photos-db (by notion_id or id), merge richer fields
 *
 * Usage:
 *   npm run migrate:schema        # reads from local D1
 *   npm run migrate:schema:remote # reads from remote D1
 */

import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const REMOTE = process.argv.includes('--remote')
const FLAG = REMOTE ? '--remote' : '--local'

async function main() {
  console.log(REMOTE ? 'Remote migration mode' : 'Local migration mode')

  // Step 1: Export photos-db
  console.log('Exporting photos-db...')
  let photosApiData = []
  try {
    const result = execSync(
      `cd ../photos-api && npx wrangler d1 execute photos-db ${FLAG} --command="SELECT * FROM photos" --json`,
      { encoding: 'utf-8', cwd: '/Users/kski/Developer/photos-api' }
    )
    const parsed = JSON.parse(result)
    photosApiData = parsed[0]?.results || []
    console.log(`  Exported ${photosApiData.length} rows from photos-db`)
  } catch (error) {
    console.warn('Could not export photos-db. Is the project in ../photos-api?')
    console.warn(error.message)
    // Continue with empty merge - schema columns will still be backfilled
  }

  // Build lookup maps
  const byId = new Map()
  const byNotionId = new Map()
  for (const photo of photosApiData) {
    if (photo.id) byId.set(photo.id, photo)
    if (photo.notion_id) byNotionId.set(photo.notion_id, photo)
  }

  // Step 2: Read current climb-log-db photos
  console.log('Reading climb-log-db photos...')
  const climbResult = execSync(
    `npx wrangler d1 execute climb-log-db ${FLAG} --command="SELECT id, src, date FROM photos" --json`,
    { encoding: 'utf-8' }
  )
  const climbData = JSON.parse(climbResult)
  const climbPhotos = climbData[0]?.results || []
  console.log(`  Found ${climbPhotos.length} rows in climb-log-db`)

  // Step 3 & 4: Build and execute UPDATE statements
  let updated = 0
  let merged = 0

  for (const photo of climbPhotos) {
    const id = photo.id
    const src = photo.src || ''
    const ext = src.split('.').pop()?.toLowerCase() || 'jpg'
    const format = ext === 'png' ? 'png' : ext === 'webp' ? 'webp' : 'jpeg'
    const r2Key = `photos/${id}`

    // Look for matching photo in photos-api data
    const match = byId.get(id) || byNotionId.get(id)

    let sql = `UPDATE photos SET `
    const sets = []
    const values = []

    sets.push(`r2_key = ?`)
    values.push(r2Key)

    sets.push(`format = ?`)
    values.push(format)

    sets.push(`site = 'climb-log'`)

    sets.push(`source = 'notion'`)

    if (match) {
      merged++
      if (match.notion_id) {
        sets.push(`notion_id = ?`)
        values.push(match.notion_id)
      }
      if (match.blurhash) {
        sets.push(`blurhash = ?`)
        values.push(match.blurhash)
      }
      if (match.size_bytes) {
        sets.push(`size_bytes = ?`)
        values.push(match.size_bytes)
      }
      if (match.flickr_id) {
        sets.push(`flickr_id = ?`)
        values.push(match.flickr_id)
      }
      if (match.accent_color) {
        sets.push(`accent_color = ?`)
        values.push(match.accent_color)
      }
      if (match.source_url) {
        sets.push(`source_url = ?`)
        values.push(match.source_url)
      }
    }

    sets.push(`updated_at = datetime('now')`)

    sql += sets.join(', ')
    sql += ` WHERE id = ?`
    values.push(id)

    try {
      execSync(
        `npx wrangler d1 execute climb-log-db ${FLAG} --command="${sql.replace(/"/g, '\\"')}" --json`,
        {
          encoding: 'utf-8',
          input: JSON.stringify(values), // Not used by wrangler but kept for reference
        }
      )
      updated++
    } catch (error) {
      console.error(`Failed to update photo ${id}:`, error.message)
    }
  }

  console.log(`\nMigration complete!`)
  console.log(`  Updated: ${updated} rows`)
  console.log(`  Merged with photos-api data: ${merged} rows`)

  if (photosApiData.length > 0) {
    // Also backfill any photos that exist in photos-api but NOT in climb-log-db
    const climbIds = new Set(climbPhotos.map((p) => p.id))
    const newPhotos = photosApiData.filter((p) => !climbIds.has(p.id))

    if (newPhotos.length > 0) {
      console.log(`\n  Found ${newPhotos.length} photos in photos-api not in climb-log-db`)
      console.log('  Inserting them...')

      for (const photo of newPhotos) {
        const sql = `
          INSERT INTO photos (
            id, notion_id, r2_key, title, caption, src, thumbnail, area, state, date,
            width, height, search_tags, exclude, format, size_bytes, site, source,
            flickr_id, accent_color, source_url, blurhash, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
        `
        const values = [
          photo.id,
          photo.notion_id || null,
          photo.r2_key || `photos/${photo.id}`,
          photo.title || null,
          photo.caption || null,
          null, // src - no direct Notion URL anymore
          null, // thumbnail
          photo.location || null,
          null, // state - parse from location if available
          photo.date || null,
          photo.width || null,
          photo.height || null,
          photo.tags || null,
          photo.exclude || 0,
          photo.format || 'jpeg',
          photo.size_bytes || null,
          photo.site || 'climb-log',
          photo.source || 'flickr',
          photo.flickr_id || null,
          photo.accent_color || null,
          photo.source_url || null,
          photo.blurhash || null,
        ]

        try {
          const paramStr = values.map((v) => (v === null ? 'NULL' : `'${String(v).replace(/'/g, "''")}'`)).join(', ')
          const insertSql = sql.replace(/\?/g, () => {
            const v = values.shift()
            return v === null ? 'NULL' : `'${String(v).replace(/'/g, "''")}'`
          })

          execSync(
            `npx wrangler d1 execute climb-log-db ${FLAG} --command="${insertSql.replace(/"/g, '\\"')}"`,
            { encoding: 'utf-8' }
          )
          updated++
        } catch (error) {
          console.error(`Failed to insert photo ${photo.id}:`, error.message)
        }
      }
    }
  }

  console.log(`\nFinal: ${updated} total rows modified/inserted`)
}

main().catch((error) => {
  console.error('Migration failed:', error)
  process.exit(1)
})
