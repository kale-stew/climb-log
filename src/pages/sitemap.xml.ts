import type { APIRoute } from 'astro'
import { getCollection } from 'astro:content'
import { env } from 'cloudflare:workers'
import { photoPath } from '../lib/photo-pages'
import { currentSlugs } from '../lib/photo-slugs'
import { getAllCollectionPhotos } from '../lib/photos-client'
import { chapterSlugFor } from '../lib/places'
import { SITE_URL } from '../lib/seo'

export const prerender = false

interface SitemapEntry {
  path: string
  lastmod?: string | null
}

const STATIC_PATHS = ['/', '/journal', '/blog', '/photos', '/places', '/peaks', '/gear', '/about']

function isoDate(value: string | null | undefined): string | null {
  if (!value) return null
  const time = Date.parse(value)
  return Number.isNaN(time) ? null : new Date(time).toISOString().slice(0, 10)
}

function escapeXml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/** Newest outing date per place chapter, so the sitemap only lists chapters that render. */
async function chapterDates(): Promise<Map<string, string | null>> {
  const latest = new Map<string, string | null>()
  if (!env.DB) return latest
  try {
    const { results } = await env.DB.prepare(
      'SELECT state, MAX(date) AS last FROM climbs GROUP BY state'
    ).all<{ state: string | null; last: string | null }>()
    for (const row of results) {
      const slug = chapterSlugFor(row.state)
      const current = latest.get(slug) ?? null
      const last = isoDate(row.last)
      latest.set(slug, current && (!last || current > last) ? current : last)
    }
  } catch (error) {
    console.error('sitemap: could not load place chapters', error)
  }
  return latest
}

/** Photo pages for gallery photos that already have a slug; the nightly sync issues the rest. */
async function photoEntries(): Promise<SitemapEntry[]> {
  if (!env.DB || !env.PHOTOS_API_ORIGIN) return []
  try {
    const photos = await getAllCollectionPhotos(env.PHOTOS_API_ORIGIN, 'portfolio')
    const slugs = await currentSlugs(env.DB, photos.map(photo => photo.id))
    return photos.flatMap(photo => {
      const slug = slugs.get(photo.id)
      return slug ? [{ path: photoPath(slug) }] : []
    })
  } catch (error) {
    console.error('sitemap: could not load photo pages', error)
    return []
  }
}

export const GET: APIRoute = async () => {
  const [posts, chapters, photos] = await Promise.all([getCollection('blog'), chapterDates(), photoEntries()])
  const newestOuting = [...chapters.values()].filter(Boolean).sort().at(-1) ?? null

  const entries: SitemapEntry[] = [
    ...STATIC_PATHS.map(path => ({
      path,
      lastmod: path === '/' || path === '/journal' || path === '/places' ? newestOuting : null,
    })),
    ...[...chapters.entries()].map(([slug, lastmod]) => ({ path: `/places/${slug}`, lastmod })),
    ...posts.map(post => ({
      path: `/blog/${post.id.replace(/\.md$/, '')}`,
      lastmod: isoDate(post.data.date),
    })),
    ...photos,
  ]

  const body = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...entries.map(entry =>
      [
        '  <url>',
        `    <loc>${escapeXml(new URL(entry.path, SITE_URL).toString())}</loc>`,
        entry.lastmod ? `    <lastmod>${entry.lastmod}</lastmod>` : null,
        '  </url>',
      ]
        .filter(Boolean)
        .join('\n'),
    ),
    '</urlset>',
    '',
  ].join('\n')

  return new Response(body, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
