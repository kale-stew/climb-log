import { describe, expect, it } from 'vitest'
import { addFigures, parseAlt, photoIdFromSrc, photosApiCaptions } from '../../src/lib/blog-figures'

const img = (src: string, alt: string) => ({
  type: 'element',
  tagName: 'img',
  properties: { src, alt },
  children: [],
})
const paragraph = (...children: unknown[]) => ({
  type: 'element',
  tagName: 'p',
  properties: {},
  children,
})
const text = (value: string) => ({ type: 'text', value })

// biome-ignore lint/suspicious/noExplicitAny: hast fixtures
async function render(children: any[], captions: Record<string, string | null> = {}) {
  const tree = { type: 'root' as const, children }
  await addFigures(tree, async id => captions[id] ?? null)
  return tree.children
}

describe('parseAlt', () => {
  it('splits a size hint from the caption', () => {
    expect(parseAlt('First light. {798x498}')).toEqual({
      text: 'First light.',
      width: 798,
      height: 498,
    })
    expect(parseAlt('No hint')).toEqual({ text: 'No hint' })
  })

  it('reads photo ids from image paths', () => {
    expect(photoIdFromSrc('/img/54d8c6f4/')).toBe('54d8c6f4')
    expect(photoIdFromSrc('/img/abc?w=800')).toBe('abc')
    expect(photoIdFromSrc('https://example.com/x.jpg')).toBeNull()
  })
})

describe('addFigures', () => {
  it('uses the photos-api caption over the Markdown text', async () => {
    const [figure] = await render([paragraph(img('/img/a1/', 'Markdown text {800x600}'))], {
      a1: 'Caption from admin',
    })
    expect(figure).toMatchObject({
      tagName: 'figure',
      children: [
        { tagName: 'img', properties: { alt: 'Markdown text', width: 800, height: 600 } },
        { tagName: 'figcaption', children: [{ value: 'Caption from admin' }] },
      ],
    })
  })

  it('strips a size hint from a photos-api caption too', async () => {
    const [figure] = await render([paragraph(img('/img/a1/', 'Markdown'))], {
      a1: 'Stored caption. {576x768}',
    })
    expect(figure).toMatchObject({ children: [{}, { children: [{ value: 'Stored caption.' }] }] })
  })

  it('falls back to the Markdown text without its size hint', async () => {
    const [figure] = await render([
      paragraph(text('\n'), img('/img/a1/', 'First light. {798x498}'), text(' ')),
    ])
    expect(figure).toMatchObject({
      tagName: 'figure',
      children: [{}, { children: [{ value: 'First light.' }] }],
    })
  })

  it('leaves images inside running text alone', async () => {
    const original = paragraph(text('See '), img('/img/a1/', 'inline'))
    const [node] = await render([original])
    expect(node).toBe(original)
  })

  it('adds no caption when there is no text at all', async () => {
    const [figure] = await render([paragraph(img('/img/a1/', ''))])
    expect(figure).toMatchObject({ tagName: 'figure', children: [{ tagName: 'img' }] })
    expect((figure as { children: unknown[] }).children).toHaveLength(1)
  })
})

describe('photosApiCaptions', () => {
  it('fetches each photo once and treats failures as no caption', async () => {
    let calls = 0
    const fetchFn = (async (url: URL) => {
      calls++
      if (String(url).endsWith('/missing')) return new Response('{}', { status: 404 })
      return new Response(JSON.stringify({ caption: 'From admin' }))
    }) as unknown as typeof fetch
    const lookup = photosApiCaptions('https://photos.test', fetchFn)
    expect(await lookup('a1')).toBe('From admin')
    expect(await lookup('a1')).toBe('From admin')
    expect(await lookup('missing')).toBeNull()
    expect(calls).toBe(2)
  })
})

describe('inline images', () => {
  it('lose their size hint but stay inline', async () => {
    const inline = img('/img/a1/', 'Riskier line? {768x341}')
    const [node] = await render([paragraph(text('Look: '), inline)])
    expect(node).toMatchObject({ tagName: 'p' })
    expect(inline.properties).toMatchObject({ alt: 'Riskier line?', width: 768, height: 341 })
  })
})
