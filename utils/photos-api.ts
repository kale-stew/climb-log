/**
 * Ported from photos-api/src/index.tsx
 * Shared photo storage embedded in climb-log.
 *
 * Changes from original:
 * - PHOTOS_BUCKET -> R2_IMAGES
 * - Exported as createPhotosApp(env) factory
 * - Removed root / redirect
 * - Admin UI uses HTML template strings instead of Hono JSX
 */

import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import {
  updatePhotoSchema,
  resizePhotoSchema,
  extractColorsSchema,
  photoListQuerySchema,
  formatZodError,
} from "../src/lib/schemas";

// Generate a short URL-safe ID from any string (used for cleaner /img/{id} URLs)
// Must match the Python: hashlib.sha256(input.encode()).hexdigest()[:8]
async function generateShortId(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex.slice(0, 8);
}

// Supported widths for public image transforms
const ALLOWED_WIDTHS = new Set([200, 400, 800, 1600]);

// In-flight transform tracking to prevent duplicate work
const inFlightTransforms = new Map<string, Promise<any>>();

/**
 * Extract the dominant color from a PNG image buffer.
 * Uses a simple k-means-like approach: sample pixels, find most common color cluster.
 * Returns hex color string like "#8B7355"
 */
function extractDominantColor(pngBuffer: Uint8Array): string | null {
  try {
    // PNG files start with signature, then chunks
    // We need to find the IDAT chunk and decompress it
    // For simplicity, we'll use a rough heuristic on raw pixel data
    
    // Find IHDR to get dimensions (should be right after signature)
    // PNG signature is 8 bytes, then IHDR chunk
    if (pngBuffer.length < 33) return null;
    
    // Skip PNG signature (8 bytes) and IHDR length (4 bytes) and type (4 bytes)
    const width = (pngBuffer[16] << 24) | (pngBuffer[17] << 16) | (pngBuffer[18] << 8) | pngBuffer[19];
    const height = (pngBuffer[20] << 24) | (pngBuffer[21] << 16) | (pngBuffer[22] << 8) | pngBuffer[23];
    
    if (width <= 0 || height <= 0 || width > 100 || height > 100) {
      // Fallback: sample from raw buffer bytes (rough approximation)
      return extractColorFromRawBytes(pngBuffer);
    }
    
    return extractColorFromRawBytes(pngBuffer);
  } catch {
    return null;
  }
}

/**
 * Sample colors from raw image bytes (works as fallback for any format)
 * Looks for byte patterns that could be RGB values
 */
function extractColorFromRawBytes(buffer: Uint8Array): string | null {
  // Skip headers (first ~100 bytes likely contain PNG/image headers)
  const startOffset = Math.min(100, Math.floor(buffer.length * 0.1));
  const endOffset = Math.floor(buffer.length * 0.9);
  
  if (endOffset - startOffset < 100) return null;
  
  // Sample RGB triplets and collect color frequencies
  const colorCounts = new Map<string, number>();
  const sampleStep = Math.max(3, Math.floor((endOffset - startOffset) / 500));
  
  for (let i = startOffset; i < endOffset - 3; i += sampleStep) {
    const r = buffer[i];
    const g = buffer[i + 1];
    const b = buffer[i + 2];
    
    // Skip values that are likely not real colors (too dark, too bright, or grayscale)
    if (r < 20 && g < 20 && b < 20) continue; // too dark
    if (r > 245 && g > 245 && b > 245) continue; // too bright
    
    // Quantize to reduce noise (round to nearest 16)
    const qr = Math.round(r / 16) * 16;
    const qg = Math.round(g / 16) * 16;
    const qb = Math.round(b / 16) * 16;
    
    const key = `${qr},${qg},${qb}`;
    colorCounts.set(key, (colorCounts.get(key) || 0) + 1);
  }
  
  if (colorCounts.size === 0) return null;
  
  // Find the most common color with decent saturation
  let bestColor = "";
  let bestScore = 0;
  
  for (const [key, count] of colorCounts) {
    const [r, g, b] = key.split(",").map(Number);
    
    // Calculate saturation (prefer colorful over gray)
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const saturation = max > 0 ? (max - min) / max : 0;
    
    // Score combines frequency and saturation preference
    const score = count * (0.5 + saturation * 0.5);
    
    if (score > bestScore) {
      bestScore = score;
      bestColor = key;
    }
  }
  
  if (!bestColor) return null;
  
  const [r, g, b] = bestColor.split(",").map(Number);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`.toUpperCase();
}

interface Photo {
  id: string;
  short_id: string | null;
  notion_id: string | null;
  r2_key: string;
  src: string | null;
  title: string | null;
  caption: string | null;
  location: string | null;
  date: string | null;
  width: number | null;
  height: number | null;
  blurhash: string | null;
  format: string;
  size_bytes: number | null;
  site: string;
  source: string | null;
  tags: string | null;
  exclude: number;
  flickr_id: string | null;
  accent_color: string | null;
  source_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface PhotosApiEnv {
  DB: D1Database;
  R2_IMAGES: R2Bucket;
  IMAGES: ImagesBinding;
}

// ============ HTML TEMPLATE HELPERS ============

function escapeHtml(str: string | null | undefined): string {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderAdminPage(title: string, content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)} | photos admin</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Fira+Code:wght@400;500&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    :root {
      --color-bg: #fafafa; --color-bg-card: #ffffff; --color-text: #1a1a1a;
      --color-text-muted: #666666; --color-accent: #e23500;
      --color-accent-light: rgba(226, 53, 0, 0.1); --color-orange: #ffbc2d;
      --gradient: linear-gradient(135deg, var(--color-accent) 0%, var(--color-orange) 100%);
      --space-xs: 0.25rem; --space-sm: 0.5rem; --space-md: 1rem;
      --space-lg: 1.5rem; --space-xl: 2rem; --space-2xl: 3rem;
      --radius-sm: 0.375rem; --radius-md: 0.5rem; --radius-lg: 0.75rem; --radius-xl: 1rem;
      --shadow-sm: 0 1px 2px rgba(0,0,0,0.05); --shadow-md: 0 4px 6px rgba(0,0,0,0.07);
      --shadow-lg: 0 10px 25px rgba(0,0,0,0.1);
      --font-body: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      --font-mono: 'Fira Code', monospace; --max-width: 1400px;
    }
    body { margin: 0; padding: 0; font-family: var(--font-body); background: var(--color-bg);
      color: var(--color-text); line-height: 1.6; min-height: 100vh; }
    .admin-header { background: var(--gradient); padding: var(--space-md) var(--space-xl);
      position: sticky; top: 0; z-index: 100; box-shadow: var(--shadow-md); }
    .admin-header-inner { max-width: var(--max-width); margin: 0 auto;
      display: flex; justify-content: space-between; align-items: center; }
    .admin-header a { color: white; text-decoration: none; font-weight: 600; font-size: 1.1rem; }
    .admin-header nav { display: flex; gap: var(--space-lg); }
    .admin-header nav a { font-weight: 500; font-size: 0.9rem; opacity: 0.9; transition: opacity 0.2s; }
    .admin-header nav a:hover { opacity: 1; }
    .admin-main { max-width: var(--max-width); margin: 0 auto; padding: var(--space-xl); }
    .page-title { margin-bottom: var(--space-xl); }
    .page-title h1 { font-size: 1.75rem; font-weight: 700; margin: 0 0 var(--space-sm); }
    .page-title p { color: var(--color-text-muted); margin: 0; font-size: 0.95rem; }
    .photo-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: var(--space-lg); }
    .photo-card { background: var(--color-bg-card); border-radius: var(--radius-lg); overflow: hidden;
      box-shadow: var(--shadow-sm); transition: box-shadow 0.2s, transform 0.2s;
      border-left: 3px solid transparent; cursor: pointer; text-decoration: none;
      color: inherit; display: block; }
    .photo-card:hover { box-shadow: var(--shadow-lg); transform: translateY(-2px);
      border-left-color: var(--color-accent); }
    .photo-card img { width: 100%; height: 160px; object-fit: cover; display: block; }
    .photo-card-info { padding: var(--space-sm) var(--space-md); }
    .photo-card-title { font-weight: 600; font-size: 0.9rem; margin: 0 0 var(--space-xs);
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .photo-card-meta { font-size: 0.75rem; color: var(--color-text-muted); font-family: var(--font-mono); }
    .photo-card-tags { display: flex; flex-wrap: wrap; gap: var(--space-xs); margin-top: var(--space-sm); }
    .tag { display: inline-block; background: var(--color-accent-light); color: var(--color-accent);
      padding: 0.125em 0.5em; border-radius: var(--radius-sm); font-size: 0.7rem;
      font-weight: 500; font-family: var(--font-mono); }
    .pagination { display: flex; justify-content: center; align-items: center;
      gap: var(--space-lg); margin-top: var(--space-2xl); padding: var(--space-lg) 0; }
    .pagination a, .pagination span { padding: var(--space-sm) var(--space-md);
      border-radius: var(--radius-md); text-decoration: none; font-size: 0.9rem; }
    .pagination a { background: var(--color-bg-card); color: var(--color-accent);
      box-shadow: var(--shadow-sm); border: 1px solid var(--color-accent-light); }
    .pagination a:hover { background: var(--color-accent-light); }
    .pagination span { color: var(--color-text-muted); }
    .detail-layout { display: grid; grid-template-columns: 1fr 380px; gap: var(--space-2xl); align-items: start; }
    @media (max-width: 900px) { .detail-layout { grid-template-columns: 1fr; } }
    .detail-image { background: var(--color-bg-card); border-radius: var(--radius-lg);
      overflow: hidden; box-shadow: var(--shadow-md); }
    .detail-image img { width: 100%; display: block; }
    .detail-sidebar { position: sticky; top: 80px; }
    .detail-panel { background: var(--color-bg-card); border-radius: var(--radius-lg);
      padding: var(--space-lg); box-shadow: var(--shadow-sm); margin-bottom: var(--space-lg); }
    .detail-panel h2 { font-size: 1.1rem; margin: 0 0 var(--space-md); font-weight: 600; }
    .meta-table { width: 100%; border-collapse: collapse; }
    .meta-table td { padding: var(--space-sm) 0; border-bottom: 1px solid rgba(0,0,0,0.05); font-size: 0.85rem; }
    .meta-table td:first-child { color: var(--color-text-muted); font-family: var(--font-mono); width: 120px; }
    .meta-table td:last-child { text-align: right; word-break: break-all; }
    .meta-table tr:last-child td { border-bottom: none; }
    .sizes-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: var(--space-md); }
    .size-item { text-align: center; }
    .size-item img { width: 100%; border-radius: var(--radius-sm); margin-bottom: var(--space-sm); }
    .size-item code { font-family: var(--font-mono); font-size: 0.75rem; background: var(--color-accent-light);
      color: var(--color-accent); padding: 0.2em 0.5em; border-radius: var(--radius-sm); }
    .size-item button { margin-top: var(--space-xs); background: transparent;
      border: 1px solid var(--color-accent-light); color: var(--color-accent);
      padding: var(--space-xs) var(--space-sm); border-radius: var(--radius-sm);
      font-size: 0.75rem; cursor: pointer; font-family: var(--font-body); }
    .size-item button:hover { background: var(--color-accent-light); }
    .admin-footer { background: var(--gradient); padding: var(--space-lg) var(--space-xl);
      margin-top: auto; text-align: center; }
    .admin-footer a { color: white; text-decoration: none; font-weight: 500; font-size: 0.85rem; opacity: 0.9; }
    .back-link { display: inline-flex; align-items: center; gap: var(--space-sm); color: var(--color-accent);
      text-decoration: none; font-weight: 500; margin-bottom: var(--space-lg); font-size: 0.9rem; }
    .back-link:hover { text-decoration: underline; }
    .empty-state { text-align: center; padding: 3rem var(--space-xl); color: var(--color-text-muted); }
    .empty-state h2 { margin: 0 0 var(--space-sm); color: var(--color-text); }
  </style>
</head>
<body>
  <header class="admin-header">
    <div class="admin-header-inner">
      <a href="/admin/photos">photos admin</a>
      <nav>
        <a href="/admin/photos">grid</a>
        <a href="/api/photos/docs">api docs</a>
      </nav>
    </div>
  </header>
  <main class="admin-main">
    ${content}
  </main>
  <footer class="admin-footer">
    <a href="https://kylieis.online" target="_blank">kylieis.online</a>
  </footer>
</body>
</html>`;
}

// ============ APP FACTORY ============

export function createPhotosApp(env: PhotosApiEnv) {
  const app = new Hono<{ Bindings: PhotosApiEnv }>();

  // CORS for public API routes
  app.use("/api/*", async (c, next) => {
    c.header("Access-Control-Allow-Origin", "*");
    c.header("Access-Control-Allow-Methods", "GET, OPTIONS");
    c.header("Access-Control-Allow-Headers", "Content-Type");
    if (c.req.method === "OPTIONS") return c.body(null);
    await next();
  });

  // Admin API routes require JWT validation
  app.use("/api/admin/*", async (c, next) => {
    const jwt = c.req.header("Cf-Access-Jwt-Assertion");
    if (!jwt) {
      return c.json({ error: "Unauthorized" }, 403);
    }
    await next();
  });

  // ============ PUBLIC API ROUTES ============

  // GET /docs - Swagger UI
  app.get("/api/photos/docs", (c) => {
    const url = new URL(c.req.url);
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>photos-api | Documentation</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css">
  <style>body { margin: 0; padding: 0; } .swagger-ui .topbar { display: none; } .swagger-ui .info { margin: 20px 0; }</style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    window.onload = () => {
      SwaggerUIBundle({
        url: '${url.origin}/api/photos/openapi.json',
        dom_id: '#swagger-ui',
        presets: [SwaggerUIBundle.presets.apis, SwaggerUIBundle.SwaggerUIStandalonePreset],
        layout: 'BaseLayout',
        defaultModelsExpandDepth: 1,
        docExpansion: 'list',
      });
    };
  </script>
</body>
</html>`;
    return c.html(html);
  });

  // GET /api/photos/openapi.json
  app.get("/api/photos/openapi.json", (c) => {
    const url = new URL(c.req.url);
    return c.json(getOpenApiSpec(url.origin));
  });

  // GET /img/{photo-id}
  app.get("/img/:photoId", async (c) => {
    const photoId = c.req.param("photoId");
    const requestedWidth = c.req.query("w");
    let ctx: ExecutionContext | undefined;
    try { ctx = c.executionCtx; } catch { /* local dev has no ExecutionContext */ }

    if (!photoId) return c.text("Missing photo ID", 400);

    let photo = await env.DB.prepare("SELECT * FROM photos WHERE id = ?")
      .bind(photoId)
      .first<Photo>();

    // Fallback: try looking up by short_id
    if (!photo) {
      photo = await env.DB.prepare("SELECT * FROM photos WHERE short_id = ?")
        .bind(photoId)
        .first<Photo>();
    }

    if (!photo) return c.text("Photo not found", 404);

    // Fallback for photos not yet migrated to R2 (r2_key is null)
    if (!photo.r2_key) {
      if (photo.src && !photo.src.includes('amazonaws.com')) {
        return c.redirect(photo.src, 302);
      }
      return c.text("Photo not available", 404);
    }

    let r2Key: string;
    let width: number | null = null;

    if (requestedWidth && requestedWidth !== "original") {
      width = parseInt(requestedWidth, 10);
      if (!ALLOWED_WIDTHS.has(width)) {
        return c.text(
          `Invalid width. Allowed: ${Array.from(ALLOWED_WIDTHS).join(", ")}, original`,
          400
        );
      }
      r2Key = `${photo.r2_key}/w${width}.webp`;
    } else {
      r2Key = `${photo.r2_key}/original.${photo.format}`;
    }

    let object = await env.R2_IMAGES.get(r2Key);

    if (!object && width) {
      object = await getOrCreateTransform(env, ctx, photo, width, r2Key);
    }

    if (!object) {
      const originalKey = `${photo.r2_key}/original.${photo.format}`;
      object = await env.R2_IMAGES.get(originalKey);

      if (!object) {
        // Fallback: redirect to original src URL if R2 object missing
        // (common in local dev before R2 sync, or if object was deleted)
        if (photo.src) {
          return c.redirect(photo.src, 302);
        }
        return c.text("Photo file not found", 404);
      }

      return new Response(object.body, {
        headers: {
          "Content-Type": object.httpMetadata?.contentType || `image/${photo.format}`,
          "Cache-Control": "public, max-age=3600",
          "X-Transform-Failed": "true",
        },
      });
    }

    const contentType = width
      ? "image/webp"
      : object.httpMetadata?.contentType || `image/${photo.format}`;

    return new Response(object.body, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
        "ETag": object.etag,
      },
    });
  });

  // GET /api/photos
  app.get("/api/photos", async (c) => {
    const parsed = photoListQuerySchema.safeParse(c.req.query());
    if (!parsed.success) {
      return c.json({ error: formatZodError(parsed.error) }, 400);
    }
    const { site, limit, offset } = parsed.data;

    let query = "SELECT * FROM photos WHERE exclude = 0";
    const params: (string | number)[] = [];

    if (site) {
      query += " AND (site = ? OR site = 'both')";
      params.push(site);
    }

    query += " ORDER BY date DESC LIMIT ? OFFSET ?";
    params.push(limit, offset);

    const result = await env.DB.prepare(query).bind(...params).all<Photo>();

    return c.json({
      photos: result.results,
      meta: { limit, offset, count: result.results.length },
    });
  });

  // GET /api/photos/{id}
  app.get("/api/photos/:id", async (c) => {
    const id = c.req.param("id");
    let photo = await env.DB.prepare("SELECT * FROM photos WHERE id = ?")
      .bind(id)
      .first<Photo>();

    if (!photo) {
      photo = await env.DB.prepare("SELECT * FROM photos WHERE short_id = ?")
        .bind(id)
        .first<Photo>();
    }

    if (!photo) return c.json({ error: "Photo not found" }, 404);
    return c.json(photo);
  });

  // ============ ADMIN UI ROUTES ============

  // GET /admin/photos - Photo Grid
  app.get("/admin/photos", async (c) => {
    const url = new URL(c.req.url);
    const pageParam = parseInt(url.searchParams.get("page") || "1", 10);
    const page = Number.isNaN(pageParam) || pageParam < 1 ? 1 : pageParam;
    const perPage = 50;
    const offset = (page - 1) * perPage;

    const result = await env.DB.prepare(
      "SELECT * FROM photos WHERE exclude = 0 ORDER BY date DESC LIMIT ? OFFSET ?"
    )
      .bind(perPage, offset)
      .all<Photo>();

    const countResult = await env.DB.prepare(
      "SELECT COUNT(*) as total FROM photos WHERE exclude = 0"
    ).first<{ total: number }>();

    const total = countResult?.total || 0;
    const totalPages = Math.ceil(total / perPage);
    const photos = result.results || [];

    const origin = url.origin;

    let content: string;
    if (photos.length === 0) {
      content = `<div class="empty-state"><h2>no photos found</h2><p>upload some photos to get started</p></div>`;
    } else {
      const photoCards = photos.map((photo) => {
        const meta = [
          photo.date || 'no date',
          photo.width && photo.height ? `${photo.width}x${photo.height}` : ''
        ].filter(Boolean).join(' · ');
        const photoId = photo.short_id || photo.id;
        const tags = photo.site ? `<div class="photo-card-tags"><span class="tag">${escapeHtml(photo.site)}</span></div>` : '';
        return `<a href="/admin/photos/${escapeHtml(photoId)}" class="photo-card">
          <img src="${origin}/img/${escapeHtml(photoId)}?w=200" alt="${escapeHtml(photo.title || 'photo')}" loading="lazy">
          <div class="photo-card-info">
            <div class="photo-card-title">${escapeHtml(photo.title || 'untitled')}</div>
            <div class="photo-card-meta">${escapeHtml(meta)}</div>
            ${tags}
          </div>
        </a>`;
      }).join('');

      const pagination = totalPages > 1
        ? `<div class="pagination">
            ${page > 1 ? `<a href="/admin/photos?page=${page - 1}">← previous</a>` : ''}
            <span>page ${page} of ${totalPages}</span>
            ${page < totalPages ? `<a href="/admin/photos?page=${page + 1}">next →</a>` : ''}
           </div>`
        : '';

      content = `<div class="page-title">
        <h1>photo grid</h1>
        <p>${total} photos · page ${page} of ${totalPages}</p>
      </div>
      <div class="photo-grid">${photoCards}</div>
      ${pagination}`;
    }

    return c.html(renderAdminPage('photo grid', content));
  });

  // GET /admin/photos/{id} - Photo Detail
  app.get("/admin/photos/:id", async (c) => {
    const id = c.req.param("id");
    let photo = await env.DB.prepare("SELECT * FROM photos WHERE id = ?")
      .bind(id)
      .first<Photo>();

    if (!photo) {
      photo = await env.DB.prepare("SELECT * FROM photos WHERE short_id = ?")
        .bind(id)
        .first<Photo>();
    }

    if (!photo) return c.text("Photo not found", 404);

    const photoId = photo.short_id || photo.id;
    const origin = new URL(c.req.url).origin;
    const standardWidths = [200, 400, 800, 1600];

    const metaRows = [
      ['id', `<code>${escapeHtml(photo.id)}</code>`],
      ['title', escapeHtml(photo.title || '—')],
      ['location', escapeHtml(photo.location || '—')],
      ['date', escapeHtml(photo.date || '—')],
      ['dimensions', photo.width && photo.height ? `${photo.width}x${photo.height}` : '—'],
      ['format', escapeHtml(photo.format)],
      ['size', photo.size_bytes ? `${(photo.size_bytes / 1024 / 1024).toFixed(2)} MB` : '—'],
      ['site', escapeHtml(photo.site)],
      ['source', escapeHtml(photo.source || '—')],
      ['tags', escapeHtml(photo.tags || '—')],
      ['blurhash', `<code style="font-size: 0.7rem;">${escapeHtml(photo.blurhash || '—')}</code>`],
      ['created', escapeHtml(photo.created_at)],
      ['updated', escapeHtml(photo.updated_at)],
    ].map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join('');

    const sizesGrid = standardWidths.map((w) => `<div class="size-item">
      <img src="${origin}/img/${escapeHtml(photoId)}?w=${w}" alt="${w}px" loading="lazy">
      <code>${w}px</code>
      <button type="button" onclick="navigator.clipboard.writeText('${origin}/img/${escapeHtml(photoId)}?w=${w}'); this.textContent='copied!'; setTimeout(() => this.textContent='copy url', 1000);">copy url</button>
    </div>`).join('');

    const content = `<a href="/admin/photos" class="back-link">← back to grid</a>
    <div class="detail-layout">
      <div>
        <div class="detail-image">
          <img src="${origin}/img/${escapeHtml(photoId)}" alt="${escapeHtml(photo.title || 'photo')}">
        </div>
      </div>
      <div class="detail-sidebar">
        <div class="detail-panel">
          <h2>metadata</h2>
          <table class="meta-table"><tbody>${metaRows}</tbody></table>
        </div>
        <div class="detail-panel">
          <h2>all sizes</h2>
          <div class="sizes-grid">${sizesGrid}</div>
        </div>
        <div class="detail-panel">
          <h2>original</h2>
          <div class="size-item">
            <button type="button" onclick="navigator.clipboard.writeText('${origin}/img/${escapeHtml(photoId)}'); this.textContent='copied!'; setTimeout(() => this.textContent='copy original url', 1000);">copy original url</button>
          </div>
        </div>
      </div>
    </div>`;

    return c.html(renderAdminPage(photo.title || 'untitled photo', content));
  });

  // ============ ADMIN API ROUTES ============

  // PATCH /api/admin/photos/{id} - Edit metadata
  app.patch(
    "/api/admin/photos/:id",
    zValidator("json", updatePhotoSchema, (result, c) => {
      if (!result.success) {
        return c.json({ error: formatZodError(result.error) }, 400);
      }
    }),
    async (c) => {
      const id = c.req.param("id");
      const body = c.req.valid("json");

      // Resolve short_id to full id
      let photoId = id;
      const shortLookup = await env.DB.prepare("SELECT id FROM photos WHERE short_id = ?")
        .bind(id)
        .first<{ id: string }>();
      if (shortLookup) photoId = shortLookup.id;

      // Check photo exists
      const existingPhoto = await env.DB.prepare("SELECT id FROM photos WHERE id = ?")
        .bind(photoId)
        .first<{ id: string }>();
      if (!existingPhoto) {
        return c.json({ error: "Photo not found" }, 404);
      }

      const updateFields: string[] = [];
      const updateValues: (string | number | null)[] = [];

      // Type-safe field extraction from validated body
      if (body.title !== undefined) {
        updateFields.push("title");
        updateValues.push(body.title);
      }
      if (body.location !== undefined) {
        updateFields.push("location");
        updateValues.push(body.location);
      }
      if (body.date !== undefined) {
        updateFields.push("date");
        updateValues.push(body.date);
      }
      if (body.tags !== undefined) {
        updateFields.push("tags");
        updateValues.push(body.tags);
      }
      if (body.site !== undefined) {
        updateFields.push("site");
        updateValues.push(body.site);
      }
      if (body.exclude !== undefined) {
        updateFields.push("exclude");
        updateValues.push(body.exclude ? 1 : 0);
      }
      if (body.caption !== undefined) {
        updateFields.push("caption");
        updateValues.push(body.caption);
      }

      if (updateFields.length === 0) {
        return c.json({ error: "No valid fields to update" }, 400);
      }

      const setClause = updateFields.map(f => `${f} = ?`).join(", ") + ", updated_at = datetime('now')";
      updateValues.push(photoId); // for WHERE clause

      try {
        await env.DB.prepare(`UPDATE photos SET ${setClause} WHERE id = ?`).bind(...updateValues).run();
        const photo = await env.DB.prepare("SELECT * FROM photos WHERE id = ?")
          .bind(photoId)
          .first<Photo>();
        return c.json(photo);
      } catch (error) {
        return c.json({ error: "Update failed" }, 500);
      }
    }
  );

  // DELETE /api/admin/photos/{id} - Delete photo
  app.delete("/api/admin/photos/:id", async (c) => {
    const id = c.req.param("id");
    let photo = await env.DB.prepare("SELECT * FROM photos WHERE id = ?")
      .bind(id)
      .first<Photo>();

    if (!photo) {
      photo = await env.DB.prepare("SELECT * FROM photos WHERE short_id = ?")
        .bind(id)
        .first<Photo>();
    }

    if (!photo) return c.json({ error: "Photo not found" }, 404);

    const photoId = photo.id;

    // Delete from D1
    await env.DB.prepare("DELETE FROM photos WHERE id = ?").bind(photoId).run();

    // Delete from R2
    try {
      const prefix = `${photo.r2_key}/`;
      const listed = await env.R2_IMAGES.list({ prefix });
      for (const obj of listed.objects) {
        await env.R2_IMAGES.delete(obj.key);
      }
    } catch {
      // R2 delete failures are non-critical
    }

    return c.json({ success: true, deleted: photoId });
  });

  // POST /api/admin/resize - Custom resize
  app.post(
    "/api/admin/photos/resize",
    zValidator("json", resizePhotoSchema, (result, c) => {
      if (!result.success) {
        return c.json({ error: formatZodError(result.error) }, 400);
      }
    }),
    async (c) => {
      const { photoId, width } = c.req.valid("json");

      let photo = await env.DB.prepare("SELECT * FROM photos WHERE id = ?")
        .bind(photoId)
        .first<Photo>();

      if (!photo) {
        photo = await env.DB.prepare("SELECT * FROM photos WHERE short_id = ?")
          .bind(photoId)
          .first<Photo>();
      }

      if (!photo) return c.json({ error: "Photo not found" }, 404);

      const r2Key = `${photo.r2_key}/w${width}.webp`;

      const existing = await env.R2_IMAGES.get(r2Key);
      if (existing) {
        const origin = new URL(c.req.url).origin;
        return c.json({ url: `${origin}/img/${photoId}?w=${width}`, cached: true, width });
      }

      const originalKey = `${photo.r2_key}/original.${photo.format}`;
      const original = await env.R2_IMAGES.get(originalKey);
      if (!original) return c.json({ error: "Original not found" }, 404);

      try {
        const transformed = await env.IMAGES.input(original.body)
          .transform({ width, fit: "scale-down" })
          .output({ format: "image/webp", quality: 85 });

        const buffer = await transformed.response().arrayBuffer();
        await env.R2_IMAGES.put(r2Key, buffer, {
          httpMetadata: { contentType: "image/webp" },
        });

        const origin = new URL(c.req.url).origin;
        return c.json({ url: `${origin}/img/${photoId}?w=${width}`, cached: false, width });
      } catch (error) {
        return c.json({ error: "Transform failed" }, 500);
      }
    }
  );

  // POST /api/admin/photos/extract-colors - Extract accent colors for photos missing them
  // Can be called via MCP or admin UI to batch-process photos
  app.post(
    "/api/admin/photos/extract-colors",
    zValidator("json", extractColorsSchema, (result, c) => {
      if (!result.success) {
        return c.json({ error: formatZodError(result.error) }, 400);
      }
    }),
    async (c) => {
      const { limit, photoId } = c.req.valid("json");

      let photos: Photo[];
    
    if (photoId) {
      // Single photo mode
      let photo = await env.DB.prepare("SELECT * FROM photos WHERE id = ?")
        .bind(photoId)
        .first<Photo>();
      if (!photo) {
        photo = await env.DB.prepare("SELECT * FROM photos WHERE short_id = ?")
          .bind(photoId)
          .first<Photo>();
      }
      if (!photo) return c.json({ error: "Photo not found" }, 404);
      photos = [photo];
    } else {
      // Batch mode: get photos missing accent_color
      const result = await env.DB.prepare(
        `SELECT * FROM photos 
         WHERE r2_key IS NOT NULL 
           AND (accent_color IS NULL OR accent_color = '')
         ORDER BY date DESC 
         LIMIT ?`
      ).bind(limit).all<Photo>();
      photos = result.results || [];
    }

    if (photos.length === 0) {
      return c.json({ message: "No photos need color extraction", processed: 0 });
    }

    const results: { id: string; accent_color: string | null; error?: string }[] = [];

    for (const photo of photos) {
      try {
        // Get a small version of the image for color sampling
        const originalKey = `${photo.r2_key}/original.${photo.format}`;
        const original = await env.R2_IMAGES.get(originalKey);
        
        if (!original) {
          results.push({ id: photo.id, accent_color: null, error: "Original not found" });
          continue;
        }

        // Transform to a tiny image (32x32) for fast color extraction
        const transformed = await env.IMAGES.input(original.body)
          .transform({ width: 32, height: 32, fit: "cover" })
          .output({ format: "image/png" });
        
        const buffer = await transformed.response().arrayBuffer();
        const accentColor = extractDominantColor(new Uint8Array(buffer));

        if (accentColor) {
          // Update database
          await env.DB.prepare(
            "UPDATE photos SET accent_color = ?, updated_at = datetime('now') WHERE id = ?"
          ).bind(accentColor, photo.id).run();
          
          results.push({ id: photo.id, accent_color: accentColor });
        } else {
          results.push({ id: photo.id, accent_color: null, error: "Could not extract color" });
        }
      } catch (error) {
        results.push({ 
          id: photo.id, 
          accent_color: null, 
          error: error instanceof Error ? error.message : "Unknown error" 
        });
      }
    }

    const successful = results.filter(r => r.accent_color && !r.error).length;
    const remaining = await env.DB.prepare(
      "SELECT COUNT(*) as count FROM photos WHERE r2_key IS NOT NULL AND (accent_color IS NULL OR accent_color = '')"
    ).first<{ count: number }>();

    return c.json({
      processed: photos.length,
      successful,
      remaining: remaining?.count || 0,
      results,
    });
    }
  );

  // POST /api/admin/upload - Upload new photo
  app.post("/api/admin/photos/upload", async (c) => {
    const formData = await c.req.formData();
    const file = formData.get("image") as File | null;
    const title = formData.get("title") as string | null;
    const location = formData.get("location") as string | null;
    const date = formData.get("date") as string | null;
    const site = (formData.get("site") as string | null) || "kylieis-online";
    const tags = formData.get("tags") as string | null;

    if (!file) {
      return c.json({ error: "image file required" }, 400);
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return c.json({ error: "Only JPEG, PNG, WebP allowed" }, 400);
    }

    const MAX_SIZE = 20 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return c.json({ error: "File too large (max 20MB)" }, 400);
    }

    const id = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
    const shortId = await generateShortId(id);
    
    // Map MIME type to format (fixes WebP being stored as "jpeg")
    const formatMap: Record<string, string> = {
      "image/jpeg": "jpeg",
      "image/png": "png",
      "image/webp": "webp",
    };
    const format = formatMap[file.type] ?? "jpeg";
    const r2Key = `photos/${id}`;

    const arrayBuffer = await file.arrayBuffer();
    await env.R2_IMAGES.put(`${r2Key}/original.${format}`, arrayBuffer, {
      httpMetadata: { contentType: file.type },
    });

    let width: number | null = null;
    let height: number | null = null;
    try {
      const stream = file.stream() as ReadableStream<Uint8Array>;
      const info = await env.IMAGES.info(stream);
      if ("width" in info && "height" in info) {
        width = info.width || null;
        height = info.height || null;
      }
    } catch {
      // Dimensions extraction failed
    }

    try {
      await env.DB.prepare(`
        INSERT INTO photos (
          id, short_id, r2_key, title, location, date, width, height, format,
          site, source, tags, exclude, size_bytes, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'upload', ?, 0, ?, datetime('now'), datetime('now'))
      `).bind(
        id,
        shortId,
        r2Key,
        title || null,
        location || null,
        date || null,
        width,
        height,
        format,
        site,
        tags || '[]',
        file.size
      ).run();
    } catch (error) {
      await env.R2_IMAGES.delete(`${r2Key}/original.${format}`);
      return c.json({ error: "Database insert failed" }, 500);
    }

    return c.json({
      id,
      url: `${new URL(c.req.url).origin}/img/${id}`,
      title,
      width,
      height,
    });
  });

  return app;
}

// ============ IMAGE TRANSFORM HELPERS ============

async function getOrCreateTransform(
  env: PhotosApiEnv,
  _ctx: ExecutionContext | undefined,
  photo: Photo,
  width: number,
  targetKey: string
): Promise<any> {
  const cacheKey = `${photo.id}:${width}`;

  const existing = inFlightTransforms.get(cacheKey);
  if (existing) return existing;

  const transformPromise = (async (): Promise<any> => {
    try {
      const originalKey = `${photo.r2_key}/original.${photo.format}`;
      const original = await env.R2_IMAGES.get(originalKey);
      if (!original) return null;

      if (!env.IMAGES) {
        console.warn("IMAGES binding not available, skipping transform");
        return null;
      }

      const transformed = await env.IMAGES.input(original.body)
        .transform({ width, fit: "scale-down" })
        .output({ format: "image/webp", quality: 85 });

      const transformedBuffer = await transformed.response().arrayBuffer();

      await env.R2_IMAGES.put(targetKey, transformedBuffer, {
        httpMetadata: { contentType: "image/webp" },
      });

      return await env.R2_IMAGES.get(targetKey);
    } catch (error) {
      console.error("Transform error:", error);
      return null;
    } finally {
      inFlightTransforms.delete(cacheKey);
    }
  })();

  inFlightTransforms.set(cacheKey, transformPromise);
  return transformPromise;
}

// ============ OPENAPI SPEC ============

function getOpenApiSpec(baseUrl: string): object {
  return {
    openapi: "3.0.3",
    info: {
      title: "photos-api",
      description:
        "Shared photo storage API for kylies.photos and kylieis.online. Provides image serving with on-demand resizing and photo metadata.",
      version: "1.0.0",
      contact: { name: "Kylie Czajkowski", url: "https://kylieis.online" },
    },
    servers: [{ url: baseUrl }],
    paths: {
      "/img/{photoId}": {
        get: {
          summary: "Get photo image",
          description:
            "Serves the photo image. Optionally resize by specifying width. Resized images are converted to WebP and cached.",
          tags: ["Images"],
          parameters: [
            {
              name: "photoId",
              in: "path",
              required: true,
              schema: { type: "string" },
              description: "The photo ID",
              example: "517c0f03a93c",
            },
            {
              name: "w",
              in: "query",
              required: false,
              schema: { type: "integer", enum: [200, 400, 800, 1600] },
              description: "Resize width in pixels. Omit for original.",
            },
          ],
          responses: {
            "200": {
              description: "Photo image",
              content: {
                "image/jpeg": { schema: { type: "string", format: "binary" } },
                "image/webp": { schema: { type: "string", format: "binary" } },
              },
            },
            "400": { description: "Invalid width parameter" },
            "404": { description: "Photo not found" },
          },
        },
      },
      "/api/photos": {
        get: {
          summary: "List photos",
          description: "Returns a paginated list of photos with optional filtering by site.",
          tags: ["Metadata"],
          parameters: [
            {
              name: "site",
              in: "query",
              required: false,
              schema: { type: "string" },
              description: "Filter by site (e.g., 'climb-log')",
            },
            {
              name: "limit",
              in: "query",
              required: false,
              schema: { type: "integer", default: 50, maximum: 100 },
              description: "Number of photos to return (max 100)",
            },
            {
              name: "offset",
              in: "query",
              required: false,
              schema: { type: "integer", default: 0 },
              description: "Offset for pagination",
            },
          ],
          responses: {
            "200": {
              description: "List of photos",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      photos: {
                        type: "array",
                        items: { $ref: "#/components/schemas/Photo" },
                      },
                      meta: {
                        type: "object",
                        properties: {
                          limit: { type: "integer" },
                          offset: { type: "integer" },
                          count: { type: "integer" },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      "/api/photos/{photoId}": {
        get: {
          summary: "Get photo metadata",
          description: "Returns metadata for a single photo by ID.",
          tags: ["Metadata"],
          parameters: [
            {
              name: "photoId",
              in: "path",
              required: true,
              schema: { type: "string" },
              description: "The photo ID",
              example: "517c0f03a93c",
            },
          ],
          responses: {
            "200": {
              description: "Photo metadata",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Photo" },
                },
              },
            },
            "404": { description: "Photo not found" },
          },
        },
      },
    },
    components: {
      schemas: {
        Photo: {
          type: "object",
          properties: {
            id: { type: "string", example: "517c0f03a93c" },
            title: { type: "string", nullable: true, example: "Paintbrush on Spencer Peak" },
            caption: { type: "string", nullable: true },
            location: { type: "string", nullable: true, example: "Caribou-Targhee NF, Idaho" },
            date: { type: "string", format: "date", nullable: true, example: "2024-08-04" },
            width: { type: "integer", nullable: true, example: 768 },
            height: { type: "integer", nullable: true, example: 1024 },
            blurhash: { type: "string", nullable: true, example: "L:E|G2f+Wot7t:WDjZbIx^oJo0kC" },
            format: { type: "string", example: "jpeg" },
            size_bytes: { type: "integer", nullable: true },
            site: { type: "string", example: "climb-log" },
            source: { type: "string", nullable: true, example: "flickr" },
            tags: { type: "string", nullable: true },
            exclude: { type: "integer", enum: [0, 1] },
            created_at: { type: "string", format: "date-time" },
            updated_at: { type: "string", format: "date-time" },
          },
        },
      },
    },
    tags: [
      { name: "Images", description: "Image serving endpoints" },
      { name: "Metadata", description: "Photo metadata endpoints" },
    ],
  };
}
