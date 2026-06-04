/// <reference path="../.astro/types.d.ts" />
/// <reference types="@astrojs/cloudflare" />
/// <reference types="@cloudflare/workers-types" />

/**
 * Cloudflare Workers environment bindings.
 * These match the bindings defined in wrangler.jsonc.
 */
export interface CloudflareEnv {
  DB: D1Database
  R2_IMAGES: R2Bucket
  IMAGES: ImagesBinding
  ALLOWED_WIDTHS: string
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
