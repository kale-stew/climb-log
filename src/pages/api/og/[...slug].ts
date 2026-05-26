import type { APIRoute } from 'astro'
import { ImageResponse } from 'workers-og'
import { getCollection } from 'astro:content'
import { env } from 'cloudflare:workers'

export const prerender = false

// Default accent color (Trail Dust brown)
const DEFAULT_ACCENT = '#8B7355'

// Fallback hero image when post doesn't have one
const FALLBACK_HERO = '/img/9943163a'

// Cache the font fetch
let interFontData: ArrayBuffer | null = null
let crimsonFontData: ArrayBuffer | null = null
let monoFontData: ArrayBuffer | null = null

async function getInterFont(): Promise<ArrayBuffer> {
  if (interFontData) return interFontData
  const res = await fetch(
    'https://fonts.gstatic.com/s/inter/v20/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuI6fMZg.ttf',
    { headers: { 'User-Agent': 'Mozilla/5.0' } }
  )
  if (!res.ok) throw new Error(`Failed to fetch Inter font: ${res.status}`)
  interFontData = await res.arrayBuffer()
  return interFontData
}

async function getCrimsonFont(): Promise<ArrayBuffer> {
  if (crimsonFontData) return crimsonFontData
  const res = await fetch(
    'https://fonts.gstatic.com/s/crimsonpro/v28/q5uUsoa5M_tv7IihmnkabC5XiXCAlXGks1WZEGp8OA.ttf',
    { headers: { 'User-Agent': 'Mozilla/5.0' } }
  )
  if (!res.ok) throw new Error(`Failed to fetch Crimson Pro font: ${res.status}`)
  crimsonFontData = await res.arrayBuffer()
  return crimsonFontData
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

// Look up accent color from photos DB by matching short_id or src URL
async function getAccentColorFromDb(previewImgUrl: string | undefined): Promise<string | null> {
  if (!previewImgUrl) return null
  
  const DB = env.DB as D1Database | undefined
  if (!DB) return null

  try {
    // If it's a photos-api URL like /img/abc123, extract short_id
    const shortIdMatch = previewImgUrl.match(/\/img\/(\w+)/)
    if (shortIdMatch) {
      const photo = await DB.prepare(
        'SELECT accent_color FROM photos WHERE short_id = ? LIMIT 1'
      ).bind(shortIdMatch[1]).first<{ accent_color: string | null }>()
      
      if (photo?.accent_color) return photo.accent_color
    }

    // Fallback: try exact src match (for legacy URLs)
    const photo = await DB.prepare(
      'SELECT accent_color FROM photos WHERE src = ? LIMIT 1'
    ).bind(previewImgUrl).first<{ accent_color: string | null }>()
    
    if (photo?.accent_color) return photo.accent_color
  } catch {
    // DB query failed, fall through to default
  }
  
  return null
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

  // Format date
  const formattedDate = new Date(date).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  // Get fonts and accent color in parallel
  const [interFont, crimsonFont, monoFont, dbAccentColor] = await Promise.all([
    getInterFont(),
    getCrimsonFont(),
    getMonoFont(),
    getAccentColorFromDb(previewImgUrl),
  ])

  // Background color: DB accent_color > default
  // Ensure color has # prefix
  let backgroundColor = DEFAULT_ACCENT
  if (dbAccentColor) {
    backgroundColor = dbAccentColor.startsWith('#') ? dbAccentColor : `#${dbAccentColor}`
  }

  // Use post hero or fallback image
  const heroImage = previewImgUrl || FALLBACK_HERO

  // Create the OG image HTML
  // Using a semi-transparent overlay on the hero image with title and metadata
  const html = `
    <div style="display: flex; flex-direction: column; width: 1200px; height: 630px; position: relative; font-family: 'Inter'; background: ${backgroundColor};">
      <img src="${heroImage}" width="1200" height="630" style="position: absolute; top: 0; left: 0; width: 1200px; height: 630px; object-fit: cover;" />
      
      <div style="display: flex; position: absolute; top: 0; left: 0; width: 1200px; height: 630px; background: linear-gradient(180deg, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0.85) 100%);"></div>
      
      <div style="display: flex; flex-direction: column; justify-content: space-between; width: 1200px; height: 630px; padding: 48px 56px; position: relative;">
        <div style="display: flex;">
          <span style="font-size: 20px; color: rgba(255,255,255,0.7); font-weight: 400; font-family: 'JetBrains Mono';">kylies.photos</span>
        </div>
        
        <div style="display: flex; flex-direction: column;">
          <h1 style="font-family: 'Crimson Pro'; font-size: 60px; font-weight: 600; color: white; margin: 0 0 24px 0; line-height: 1.15; max-width: 1000px;">${title}</h1>
          
          <div style="display: flex; align-items: center;">
            <img src="https://pbs.twimg.com/profile_images/2058684479225610241/5SP70J78_400x400.jpg" width="44" height="44" style="width: 44px; height: 44px; border-radius: 22px; margin-right: 12px; border: 2px solid rgba(255,255,255,0.3);" />
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
        name: 'Inter',
        data: interFont,
        weight: 500,
        style: 'normal',
      },
      {
        name: 'Crimson Pro',
        data: crimsonFont,
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
