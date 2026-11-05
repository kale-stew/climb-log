/**
 * Unit tests for the pure Notion block → HTML / text renderer
 * (`src/lib/notion-render.ts`).
 */

import { describe, expect, it } from 'vitest'
import {
  escapeHtml,
  type NotionBlock,
  notionBlocksToText,
  parseNotionBody,
  renderNotionBlocks,
  richTextToHtml,
  richTextToPlain,
} from '../../src/lib/notion-render'

const para = (text: string, extra: Record<string, unknown> = {}): NotionBlock => ({
  type: 'paragraph',
  paragraph: { rich_text: [{ plain_text: text, ...extra }] },
})

describe('escapeHtml', () => {
  it('escapes HTML-significant characters', () => {
    expect(escapeHtml('<a href="x">b & c\'d</a>')).toBe(
      '&lt;a href=&quot;x&quot;&gt;b &amp; c&#39;d&lt;/a&gt;',
    )
  })
})

describe('richTextToPlain', () => {
  it('concatenates plain_text segments', () => {
    expect(richTextToPlain([{ plain_text: 'Hello ' }, { plain_text: 'world' }])).toBe('Hello world')
  })

  it('returns empty string for undefined', () => {
    expect(richTextToPlain(undefined)).toBe('')
  })
})

describe('richTextToHtml', () => {
  it('escapes text content', () => {
    expect(richTextToHtml([{ plain_text: 'a < b' }])).toBe('a &lt; b')
  })

  it('applies bold/italic/code annotations', () => {
    expect(richTextToHtml([{ plain_text: 'x', annotations: { bold: true } }])).toBe(
      '<strong>x</strong>',
    )
    expect(richTextToHtml([{ plain_text: 'x', annotations: { italic: true } }])).toBe('<em>x</em>')
    expect(richTextToHtml([{ plain_text: 'x', annotations: { code: true } }])).toBe(
      '<code>x</code>',
    )
  })

  it('renders links with safe attributes and escaped href', () => {
    expect(richTextToHtml([{ plain_text: 'REI', href: 'https://rei.com/?a="b"' }])).toBe(
      '<a href="https://rei.com/?a=&quot;b&quot;" target="_blank" rel="noopener noreferrer">REI</a>',
    )
  })
})

describe('renderNotionBlocks', () => {
  it('renders paragraphs and headings', () => {
    const html = renderNotionBlocks([
      { type: 'heading_1', heading_1: { rich_text: [{ plain_text: 'Title' }] } },
      para('Body text'),
    ])
    expect(html).toContain('<h2>Title</h2>')
    expect(html).toContain('<p>Body text</p>')
  })

  it('groups consecutive bulleted items into a single <ul>', () => {
    const item = (t: string): NotionBlock => ({
      type: 'bulleted_list_item',
      bulleted_list_item: { rich_text: [{ plain_text: t }] },
    })
    const html = renderNotionBlocks([item('one'), item('two')])
    expect(html).toBe('<ul><li>one</li><li>two</li></ul>')
  })

  it('separates a numbered list from a following bulleted list', () => {
    const html = renderNotionBlocks([
      { type: 'numbered_list_item', numbered_list_item: { rich_text: [{ plain_text: 'a' }] } },
      { type: 'bulleted_list_item', bulleted_list_item: { rich_text: [{ plain_text: 'b' }] } },
    ])
    expect(html).toContain('<ol><li>a</li></ol>')
    expect(html).toContain('<ul><li>b</li></ul>')
  })

  it('renders images with escaped url and caption', () => {
    const html = renderNotionBlocks([
      {
        type: 'image',
        image: {
          type: 'external',
          external: { url: 'https://x/y.jpg' },
          caption: [{ plain_text: 'Summit' }],
        },
      },
    ])
    expect(html).toContain('<img src="https://x/y.jpg" alt="Summit" loading="lazy" />')
    expect(html).toContain('<figcaption>Summit</figcaption>')
  })

  it('skips unsupported block types without throwing', () => {
    const html = renderNotionBlocks([{ type: 'unsupported_widget' }, para('after')])
    expect(html).toBe('<p>after</p>')
  })

  it('returns empty string for empty input', () => {
    expect(renderNotionBlocks([])).toBe('')
    expect(renderNotionBlocks(undefined)).toBe('')
  })
})

describe('notionBlocksToText', () => {
  it('joins block text with newlines', () => {
    expect(notionBlocksToText([para('line one'), para('line two')])).toBe('line one\nline two')
  })
})

describe('parseNotionBody', () => {
  it('parses a JSON block array', () => {
    expect(parseNotionBody('[{"type":"paragraph"}]')).toEqual([{ type: 'paragraph' }])
  })

  it('returns empty array on null or invalid JSON', () => {
    expect(parseNotionBody(null)).toEqual([])
    expect(parseNotionBody('not json')).toEqual([])
    expect(parseNotionBody('{"not":"array"}')).toEqual([])
  })
})
