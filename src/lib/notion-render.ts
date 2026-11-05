/**
 * Pure helpers for rendering Notion block JSON (stored in `<table>.notion_body`)
 * to HTML and plain text.
 *
 * These have no Cloudflare/Workers dependencies so they can be unit-tested and
 * reused by the cron sync (for blog/search text) and the Astro detail pages.
 *
 * Text content is HTML-escaped, so the resulting HTML is safe to inject via
 * Astro's `set:html` even though the source (Kylie's own Notion) is trusted.
 */

interface NotionAnnotations {
  bold?: boolean
  italic?: boolean
  strikethrough?: boolean
  underline?: boolean
  code?: boolean
}

export interface NotionRichText {
  plain_text?: string
  href?: string | null
  annotations?: NotionAnnotations
}

export interface NotionBlock {
  type?: string
  [key: string]: unknown
}

/** Escape a string for safe inclusion in HTML text/attribute context. */
export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** Concatenate a Notion rich-text array into a plain (unescaped) string. */
export function richTextToPlain(richText: NotionRichText[] | undefined): string {
  if (!richText) return ''
  return richText.map(rt => rt.plain_text ?? '').join('')
}

/**
 * Render a Notion rich-text array to escaped, formatted inline HTML.
 * Handles bold, italic, strikethrough, underline, inline code, and links.
 */
export function richTextToHtml(richText: NotionRichText[] | undefined): string {
  if (!richText) return ''

  return richText
    .map(rt => {
      const text = escapeHtml(rt.plain_text ?? '')
      if (!text) return ''

      let html = text
      const ann = rt.annotations ?? {}
      if (ann.code) html = `<code>${html}</code>`
      if (ann.bold) html = `<strong>${html}</strong>`
      if (ann.italic) html = `<em>${html}</em>`
      if (ann.strikethrough) html = `<s>${html}</s>`
      if (ann.underline) html = `<u>${html}</u>`

      if (rt.href) {
        const safeHref = escapeHtml(rt.href)
        html = `<a href="${safeHref}" target="_blank" rel="noopener noreferrer">${html}</a>`
      }

      return html
    })
    .join('')
}

/** Read the rich-text array off a block's type-keyed payload. */
function blockRichText(block: NotionBlock): NotionRichText[] {
  const type = block.type
  if (!type) return []
  const payload = block[type] as { rich_text?: NotionRichText[] } | undefined
  return payload?.rich_text ?? []
}

/** Resolve a Notion image block's URL (file or external). */
function imageUrl(block: NotionBlock): string | null {
  const image = block.image as
    | { type?: string; file?: { url?: string }; external?: { url?: string } }
    | undefined
  return image?.file?.url ?? image?.external?.url ?? null
}

/**
 * Extract all readable text from a Notion block array as a single string,
 * for full-text search/indexing and excerpts. List items are newline-joined.
 */
export function notionBlocksToText(blocks: NotionBlock[] | undefined): string {
  if (!blocks) return ''
  const lines: string[] = []
  for (const block of blocks) {
    const text = richTextToPlain(blockRichText(block))
    if (text) lines.push(text)
  }
  return lines.join('\n').trim()
}

const HEADING_TAG: Record<string, string> = {
  heading_1: 'h2',
  heading_2: 'h3',
  heading_3: 'h4',
}

/**
 * Render a Notion block array to an HTML string. Consecutive list items are
 * grouped into a single `<ul>`/`<ol>`. Unsupported block types are skipped.
 */
export function renderNotionBlocks(blocks: NotionBlock[] | undefined): string {
  if (!blocks || blocks.length === 0) return ''

  const parts: string[] = []
  let listTag: 'ul' | 'ol' | null = null
  const listItems: string[] = []

  const flushList = () => {
    if (listTag && listItems.length > 0) {
      parts.push(`<${listTag}>${listItems.join('')}</${listTag}>`)
    }
    listTag = null
    listItems.length = 0
  }

  for (const block of blocks) {
    const type = block.type
    if (!type) continue

    if (type === 'bulleted_list_item' || type === 'numbered_list_item') {
      const tag = type === 'bulleted_list_item' ? 'ul' : 'ol'
      if (listTag && listTag !== tag) flushList()
      listTag = tag
      listItems.push(`<li>${richTextToHtml(blockRichText(block))}</li>`)
      continue
    }

    flushList()

    switch (type) {
      case 'paragraph': {
        const html = richTextToHtml(blockRichText(block))
        parts.push(html ? `<p>${html}</p>` : '<p></p>')
        break
      }
      case 'heading_1':
      case 'heading_2':
      case 'heading_3': {
        const tag = HEADING_TAG[type]
        parts.push(`<${tag}>${richTextToHtml(blockRichText(block))}</${tag}>`)
        break
      }
      case 'quote':
        parts.push(`<blockquote>${richTextToHtml(blockRichText(block))}</blockquote>`)
        break
      case 'code': {
        const code = escapeHtml(richTextToPlain(blockRichText(block)))
        parts.push(`<pre><code>${code}</code></pre>`)
        break
      }
      case 'divider':
        parts.push('<hr />')
        break
      case 'image': {
        const url = imageUrl(block)
        if (url) {
          const caption = richTextToPlain((block.image as { caption?: NotionRichText[] })?.caption)
          const alt = escapeHtml(caption)
          const figcaption = caption ? `<figcaption>${escapeHtml(caption)}</figcaption>` : ''
          parts.push(
            `<figure><img src="${escapeHtml(url)}" alt="${alt}" loading="lazy" />${figcaption}</figure>`,
          )
        }
        break
      }
      default:
        // Unsupported block type — skip rather than break the page.
        break
    }
  }

  flushList()
  return parts.join('\n')
}

/**
 * Parse a `notion_body` column value (JSON string) into a block array.
 * Returns an empty array on null/invalid input.
 */
export function parseNotionBody(raw: string | null | undefined): NotionBlock[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as NotionBlock[]) : []
  } catch {
    return []
  }
}
