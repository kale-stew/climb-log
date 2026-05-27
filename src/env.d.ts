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

// Type the `env` export from `cloudflare:workers`
declare module 'cloudflare:workers' {
  export const env: CloudflareEnv
}

declare namespace App {
  interface Locals extends import('@astrojs/cloudflare').Runtime<CloudflareEnv> {}
}
