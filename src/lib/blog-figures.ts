/**
 * Blog images are written as `![caption {WxH}](/img/<id>/)`. At build time each image that
 * stands alone in a paragraph becomes a figure whose caption is the photo's photos-api
 * caption, falling back to the Markdown text. The photo title is never used: it names the
 * photo in listings, while the caption belongs to the post.
 */

interface HastText {
  type: 'text'
  value: string
}

interface HastElement {
  type: 'element'
  tagName: string
  properties: Record<string, unknown>
  children: HastNode[]
}

type HastNode = HastElement | HastText | { type: string; children?: HastNode[] }

interface HastRoot {
  type: 'root'
  children: HastNode[]
}

export type CaptionLookup = (id: string) => Promise<string | null>

const SIZE_HINT = /\s*\{(\d+)x(\d+)\}\s*$/
const IMG_PATH = /^\/img\/([^/?#]+)\/?(?:[?#].*)?$/

/** Split the Markdown alt text into the caption and its optional `{WxH}` size hint. */
export function parseAlt(alt: string): { text: string; width?: number; height?: number } {
  const match = alt.match(SIZE_HINT)
  if (!match) return { text: alt.trim() }
  return {
    text: alt.replace(SIZE_HINT, '').trim(),
    width: Number(match[1]),
    height: Number(match[2]),
  }
}

export function photoIdFromSrc(src: string): string | null {
  return src.match(IMG_PATH)?.[1] ?? null
}

function isElement(node: HastNode): node is HastElement {
  return node.type === 'element'
}

function isBlank(node: HastNode): boolean {
  return node.type === 'text' && !(node as HastText).value.trim()
}

/** The lone image in a paragraph, if the paragraph holds nothing else. */
function loneImage(node: HastNode): HastElement | null {
  if (!isElement(node) || node.tagName !== 'p') return null
  const content = node.children.filter(child => !isBlank(child))
  const [only] = content
  return content.length === 1 && isElement(only) && only.tagName === 'img' ? only : null
}

/** Strip size hints from every image's alt text, including images inside running text. */
function cleanAlts(node: HastNode) {
  if (isElement(node) && node.tagName === 'img' && typeof node.properties.alt === 'string') {
    const alt = parseAlt(node.properties.alt)
    node.properties.alt = alt.text
    if (alt.width && alt.height && node.properties.width == null) {
      node.properties.width = alt.width
      node.properties.height = alt.height
    }
  }
  if ('children' in node && node.children) for (const child of node.children) cleanAlts(child)
}

function collectParagraphs(
  node: HastNode,
  found: Array<{ parent: HastNode & { children: HastNode[] }; index: number; img: HastElement }>,
) {
  const children = 'children' in node ? node.children : undefined
  if (!children) return
  children.forEach((child, index) => {
    const img = loneImage(child)
    if (img) found.push({ parent: node as HastNode & { children: HastNode[] }, index, img })
    else collectParagraphs(child, found)
  })
}

export async function addFigures(tree: HastRoot, lookup: CaptionLookup): Promise<void> {
  const found: Array<{
    parent: HastNode & { children: HastNode[] }
    index: number
    img: HastElement
  }> = []
  collectParagraphs(tree, found)

  const pending = Promise.all(
    found.map(async ({ parent, index, img }, position) => {
      const alt = parseAlt(String(img.properties.alt ?? ''))
      const id = photoIdFromSrc(String(img.properties.src ?? ''))
      const stored = id ? await lookup(id).catch(() => null) : null
      const caption = (stored ? parseAlt(stored).text : '') || alt.text

      img.properties.alt = alt.text || caption
      // The first image can be the largest thing on screen; let it load right away.
      if (position > 0) img.properties.loading = 'lazy'
      if (alt.width && alt.height) {
        img.properties.width = alt.width
        img.properties.height = alt.height
      }
      const children: HastNode[] = [img]
      if (caption) {
        children.push({
          type: 'element',
          tagName: 'figcaption',
          properties: {},
          children: [{ type: 'text', value: caption }],
        })
      }
      parent.children[index] = {
        type: 'element',
        tagName: 'figure',
        properties: { className: ['post-figure'] },
        children,
      }
    }),
  )
  await pending
  cleanAlts(tree)
}

/** Caption lookup against photos-api, cached for the whole build. Failures fall back to the Markdown text. */
export function photosApiCaptions(origin: string, fetchFn: typeof fetch = fetch): CaptionLookup {
  const cache = new Map<string, Promise<string | null>>()
  return id => {
    let caption = cache.get(id)
    if (!caption) {
      caption = fetchFn(new URL(`/api/photos/${encodeURIComponent(id)}`, origin), {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(8000),
      })
        .then(async response => {
          if (response.ok)
            return ((await response.json()) as { caption?: string | null }).caption ?? null
          // A 404 is a photo that is private or gone; anything else means captions may be stale.
          if (response.status !== 404)
            console.warn(
              `[blog-figures] photos-api ${response.status} for ${id}; using the Markdown caption`,
            )
          return null
        })
        .catch(error => {
          console.warn(
            `[blog-figures] caption lookup failed for ${id} (${error}); using the Markdown caption`,
          )
          return null
        })
      cache.set(id, caption)
    }
    return caption
  }
}

export function rehypeBlogFigures(options: { origin: string }) {
  const lookup = photosApiCaptions(options.origin)
  return (tree: HastRoot) => addFigures(tree, lookup)
}
