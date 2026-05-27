/**
 * Shared type definitions for the climb-log application.
 * 
 * These interfaces match the D1 database schema defined in migrations/.
 */

/** Climb record from the `climbs` table */
export interface Climb {
  id: string
  notion_id: string | null
  date: string | null
  title: string | null
  slug: string | null
  preview_img_url: string | null
  distance: number | null
  gain: number | null
  max_elevation: number | null
  moving_time: number | null
  area: string | null
  state: string | null
  strava: string | null
  alltrails: string | null
  published: number
  created_at: string
  updated_at: string
}

/** Peak record from the `peaks` table */
export interface Peak {
  id: string
  notion_id: string | null
  name: string | null
  title: string | null // legacy column
  elevation: number
  prominence: number | null
  range: string | null
  first_completed: string | null
  attempts: number | null
  list_class: string | null
  img: string | null
  rank: number | null
  created_at: string
  updated_at: string
}

/** Gear record from the `gear` table */
export interface Gear {
  id: string
  notion_id: string | null
  name: string | null
  title: string | null // legacy column
  brand: string | null
  category: string | null
  weight_oz: number | null
  price: number | null
  rating: number | null
  status: string | null
  notes: string | null
  url: string | null
  image_url: string | null
  acquired_on: string | null
  retired_on: string | null
  color: string | null
  more_info: string | null
  pack_list: string | null
  product_str: string | null
  retailer: string | null
  created_at: string
  updated_at: string
}

/** Photo record from the `photos` table */
export interface Photo {
  id: string
  short_id: string | null
  notion_id: string | null
  r2_key: string | null
  src: string | null
  title: string | null
  caption: string | null
  location: string | null
  area: string | null
  state: string | null
  date: string | null
  width: number | null
  height: number | null
  blurhash: string | null
  format: string
  size_bytes: number | null
  site: string
  source: string | null
  search_tags: string | null
  tags: string | null
  exclude: number
  flickr_id: string | null
  accent_color: string | null
  source_url: string | null
  created_at: string
  updated_at: string
}

/** Blog post record from the `blog_posts` table */
export interface BlogPost {
  id: string
  internal_rowid: number | null
  title: string
  category: string
  content_text: string | null
  tags: string | null
  date: string | null
  slug: string | null
}

/** Post record from the legacy `posts` table */
export interface Post {
  id: string
  title: string
  category: string
  date: string | null
  preview: string | null
  preview_img_url: string | null
  created_at: string
  updated_at: string
}

/** Sync log record from the `sync_log` table */
export interface SyncLog {
  id: number
  sync_type: string
  status: string
  records_synced: number
  error_message: string | null
  started_at: string
  completed_at: string | null
}

/** Subset of Climb fields used in the climbs list view */
export interface ClimbListItem {
  id: string
  date: string | null
  title: string | null
  slug: string | null
  preview_img_url: string | null
  distance: number | null
  gain: number | null
  area: string | null
  state: string | null
  strava: string | null
}

/** Result type for Notion sync operations */
export interface SyncResult {
  table: string
  inserted: number
  updated: number
  errors: string[]
}
