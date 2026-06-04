/**
 * Database test helpers
 *
 * These helpers set up and tear down test databases using Miniflare's D1
 */

import { readFileSync } from 'fs'
import { join } from 'path'

const MIGRATIONS_DIR = join(process.cwd(), 'migrations')

/**
 * Run all migrations on a D1 database
 */
export async function runMigrations(db: D1Database): Promise<void> {
  const migrations = [
    '0001_initial_schema.sql',
    '0002_fix_nullable.sql',
    '0003_absorb_photos_api.sql',
    '0004_add_short_id.sql',
    '0005_photo_assignment_log.sql',
    '0006_schema_reconciliation.sql',
    '0007_notion_body_sync.sql',
    '0008_gear_retailer.sql',
    '0009_blog_posts_index.sql',
  ]

  for (const migration of migrations) {
    try {
      const sql = readFileSync(join(MIGRATIONS_DIR, migration), 'utf-8')
      // Split by semicolons and run each statement
      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'))

      for (const statement of statements) {
        await db.prepare(statement).run()
      }
    } catch (error) {
      // Migration file might not exist yet in tests
      console.warn(`Skipping migration ${migration}: ${error}`)
    }
  }
}

/**
 * Seed the database with test data
 */
export async function seedTestData(db: D1Database): Promise<void> {
  // Insert test climb
  await db
    .prepare(`
    INSERT INTO climbs (id, notion_id, date, title, slug, distance, gain, area, state, published)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
    .bind(
      'test-climb-1',
      '18e01b50-4364-8024-85d8-e12aba9ac803',
      '2024-06-15',
      'Green Mountain',
      'green-mountain-june-2024',
      8.5,
      2800,
      'Front Range',
      'Colorado',
      1,
    )
    .run()

  // Insert test peak
  await db
    .prepare(`
    INSERT INTO peaks (id, notion_id, name, elevation, prominence, range, first_completed)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `)
    .bind(
      'test-peak-1',
      '28e01b50-4364-8024-85d8-e12aba9ac804',
      'Longs Peak',
      14255,
      2920,
      'Front Range',
      '2023-08-10',
    )
    .run()

  // Insert test gear
  await db
    .prepare(`
    INSERT INTO gear (id, notion_id, name, brand, category, weight_oz, price, rating, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
    .bind(
      'test-gear-1',
      '38e01b50-4364-8024-85d8-e12aba9ac805',
      'Garmin InReach Mini',
      'Garmin',
      'Electronics',
      3.5,
      350,
      5,
      'Own',
    )
    .run()

  // Insert test photo
  await db
    .prepare(`
    INSERT INTO photos (id, notion_id, short_id, src, caption, date, area, state, width, height)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
    .bind(
      'test-photo-1',
      '48e01b50-4364-8024-85d8-e12aba9ac806',
      'a1b2c3d4',
      'https://example.com/photo.jpg',
      'Summit view at sunrise',
      '2024-06-15',
      'Front Range',
      'Colorado',
      4000,
      3000,
    )
    .run()
}

/**
 * Clear all data from the database
 */
export async function clearDatabase(db: D1Database): Promise<void> {
  const tables = ['climbs', 'peaks', 'gear', 'photos', 'photo_climb_links', 'sync_log']

  for (const table of tables) {
    try {
      await db.prepare(`DELETE FROM ${table}`).run()
    } catch {
      // Table might not exist
    }
  }
}
