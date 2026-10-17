import type { APIRoute } from 'astro'
import { ImageResponse } from 'workers-og'
import { getCollection } from 'astro:content'
import { env } from 'cloudflare:workers'
import { getCanonicalPhoto } from '../../../lib/photos-client'
import { formatCalendarDate } from '../../../lib/dates'
import { fetchImageDataUri, ogImageSource } from '../../../lib/og-image'

export const prerender = false

// Default accent color (Trail Dust brown)
const DEFAULT_ACCENT = '#8B7355'

// Fallback hero image when post doesn't have one
const FALLBACK_HERO = '/img/9943163a/'
const AVATAR_URL = 'https://pbs.twimg.com/profile_images/2058684479225610241/5SP70J78_400x400.jpg'

// Cache the font fetch
let frauncesFontData: ArrayBuffer | null = null
let schibstedFontData: ArrayBuffer | null = null
let monoFontData: ArrayBuffer | null = null

async function getFrauncesFont(): Promise<ArrayBuffer> {
  if (frauncesFontData) return frauncesFontData
  const res = await fetch(
    'https://fonts.gstatic.com/s/fraunces/v38/6NUh8FyLNQOQZAnv9bYEvDiIdE9Ea92uemAk_WBq8U_9v0c2Wa0K7iN7hzFUPJH58nib1603gg7S2nfgRYIcaRyjDg.ttf',
    { headers: { 'User-Agent': 'Mozilla/5.0' } }
  )
  if (!res.ok) throw new Error(`Failed to fetch Fraunces font: ${res.status}`)
  frauncesFontData = await res.arrayBuffer()
  return frauncesFontData
}

async function getSchibstedFont(): Promise<ArrayBuffer> {
  if (schibstedFontData) return schibstedFontData
  const res = await fetch(
    'https://fonts.gstatic.com/s/schibstedgrotesk/v7/JqzK5SSPQuCQF3t8uOwiUL-taUTtarVKQ9vZ6pJJWlMN_MYATw.ttf',
    { headers: { 'User-Agent': 'Mozilla/5.0' } }
  )
  if (!res.ok) throw new Error(`Failed to fetch Schibsted Grotesk font: ${res.status}`)
  schibstedFontData = await res.arrayBuffer()
  return schibstedFontData
}

async function getMonoFont(): Promise<ArrayBuffer> {
  if (monoFontData) return monoFontData
  const res = await fetch(
    'https://fonts.gstatic.com/s/jetbrainsmono/v24/tDbY2o-flEEny0FZhsfKu5WU4zr3E_BX0PnT8RD8yKxjPQ.ttf',
    { headers: { 'User-Agent': 'Mozilla/5.0' } }
  )
  if (!res.ok) throw new Error(`Failed to fetch JetBrains Mono font: ${res.status}`)
  monoFontData = await res.arrayBuffer()
  return monoFontData
}

async function getAccentColor(previewImgUrl: string | undefined): Promise<string | null> {
  if (!previewImgUrl) return null

  const identifier = previewImgUrl.match(/\/img\/([^/?#]+)/)?.[1]
  if (!identifier) return null
  return (await getCanonicalPhoto(env.PHOTOS_API_ORIGIN, identifier))?.accent_color ?? null
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export const GET: APIRoute = async ({ params }) => {
  const slug = params.slug

  if (!slug) {
    return new Response('Missing slug', { status: 400 })
  }

  // Find the blog post
  const posts = await getCollection('blog')
  const post = posts.find((p) => p.id.replace(/\.md$/, '') === slug)

  if (!post) {
    return new Response('Post not found', { status: 404 })
  }

  const { title, date, previewImgUrl } = post.data
  const safeTitle = escapeHtml(title)
  const titleSize = title.length > 60 ? 48 : title.length > 42 ? 54 : 60

  // Format date
  const formattedDate = formatCalendarDate(date, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  // Get fonts and accent color in parallel
  const heroSource = ogImageSource(previewImgUrl || FALLBACK_HERO, env.PHOTOS_API_ORIGIN)
  const [sansFont, serifFont, monoFont, accentColor, heroImage, avatarImage] = await Promise.all([
    getSchibstedFont(),
    getFrauncesFont(),
    getMonoFont(),
    getAccentColor(previewImgUrl),
    heroSource ? fetchImageDataUri(heroSource, env.IMAGES) : Promise.resolve(null),
    fetchImageDataUri(AVATAR_URL),
  ])

  // Background color: DB accent_color > default
  // Ensure color has # prefix
  let backgroundColor = DEFAULT_ACCENT
  if (accentColor) {
    backgroundColor = accentColor.startsWith('#') ? accentColor : `#${accentColor}`
  }

  // Create the OG image HTML
  // Using a semi-transparent overlay on the hero image with title and metadata
  const html = `
    <div style="display: flex; flex-direction: column; width: 1200px; height: 630px; position: relative; font-family: 'Schibsted Grotesk'; background: ${backgroundColor};">
      ${heroImage ? `<img src="${heroImage}" width="1200" height="630" style="position: absolute; top: 0; left: 0; width: 1200px; height: 630px; object-fit: cover;" />` : ''}
      
      <div style="display: flex; position: absolute; top: 0; left: 0; width: 1200px; height: 630px; background: linear-gradient(180deg, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0.85) 100%);"></div>
      
      <div style="display: flex; flex-direction: column; justify-content: space-between; width: 1200px; height: 630px; padding: 48px 56px; position: relative;">
        <div style="display: flex;">
          <span style="font-size: 20px; color: rgba(255,255,255,0.7); font-weight: 400; font-family: 'JetBrains Mono';">kylies.photos</span>
        </div>
        
        <div style="display: flex; flex-direction: column;">
          <h1 style="font-family: 'Fraunces'; font-size: ${titleSize}px; font-weight: 600; color: white; margin: 0 0 24px 0; line-height: 1.15; max-width: 1000px;">${safeTitle}</h1>
          
          <div style="display: flex; align-items: center;">
            ${avatarImage ? `<img src="${avatarImage}" width="44" height="44" style="width: 44px; height: 44px; border-radius: 22px; margin-right: 12px; border: 2px solid rgba(255,255,255,0.3);" />` : ''}
            <div style="display: flex; flex-direction: column;">
              <span style="font-size: 18px; color: white; font-weight: 500;">Kylie Czajkowski</span>
              <span style="font-size: 14px; color: rgba(255,255,255,0.7);">${formattedDate}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `

  const response = new ImageResponse(html, {
    width: 1200,
    height: 630,
    fonts: [
      {
        name: 'Schibsted Grotesk',
        data: sansFont,
        weight: 500,
        style: 'normal',
      },
      {
        name: 'Fraunces',
        data: serifFont,
        weight: 600,
        style: 'normal',
      },
      {
        name: 'JetBrains Mono',
        data: monoFont,
        weight: 400,
        style: 'normal',
      },
    ],
  })
  
  // Add cache headers to reduce load from social crawlers
  // Browser cache: 1 day, CDN cache: 1 week
  response.headers.set('Cache-Control', 'public, max-age=86400, s-maxage=604800')
  
  return response
}
