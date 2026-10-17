/// <reference path="../.astro/types.d.ts" />
/// <reference types="@astrojs/cloudflare" />
/// <reference types="@cloudflare/workers-types" />

/**
 * Cloudflare Workers environment bindings.
 * These match the bindings defined in wrangler.jsonc.
 */
export interface CloudflareEnv {
  DB: D1Database
  IMAGES: ImagesBinding
  ALLOWED_WIDTHS: string
  PHOTOS_API_ORIGIN: string
  PHOTOS_API?: Fetcher
  CRON_SECRET?: string
  NOTION_TOKEN?: string
  NOTION_CLIMBS_DB_ID?: string
  NOTION_PEAKS_DB_ID?: string
  NOTION_GEAR_DB_ID?: string
}

declare global {
  /**
   * Populate the `Cloudflare.Env` interface that `cloudflare:workers` uses to
   * type its `env` export. Declaration merging adds our bindings, so
   * `import { env } from 'cloudflare:workers'` is fully typed.
   */
  namespace Cloudflare {
    interface Env extends CloudflareEnv {}
  }

  namespace App {
    interface Locals extends import('@astrojs/cloudflare').Runtime<CloudflareEnv> {}
  }
}
