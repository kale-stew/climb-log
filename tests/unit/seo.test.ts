import { describe, expect, it } from 'vitest'
import { outingAlt } from '../../src/lib/places'
import { excerptFromMarkdown, jsonLdGraph } from '../../src/lib/seo'

describe('excerptFromMarkdown', () => {
  it('skips headings and images and strips link syntax', () => {
    const body =
      '# Title\n\n![hero](/img/abc)\n\nWe climbed [Mount Etna](https://example.com) at *dawn*.'
    expect(excerptFromMarkdown(body)).toBe('We climbed Mount Etna at dawn.')
  })

  it('cuts long paragraphs at a word boundary', () => {
    const excerpt = excerptFromMarkdown('word '.repeat(80))
    expect(excerpt?.length).toBeLessThanOrEqual(155)
    expect(excerpt?.endsWith('word…')).toBe(true)
  })

  it('returns null without prose', () => {
    expect(excerptFromMarkdown('')).toBeNull()
    expect(excerptFromMarkdown('## Only a heading')).toBeNull()
  })
})

describe('jsonLdGraph', () => {
  it('always includes the person and escapes script-closing text', () => {
    const json = jsonLdGraph([{ '@type': 'Thing', name: '</script>' }])
    expect(json).not.toContain('</script>')
    const graph = JSON.parse(json)['@graph']
    const person = graph.find((node: { '@type': string }) => node['@type'] === 'Person')
    expect(person.name).toBe('Kylie Czajkowski')
  })
})

describe('outingAlt', () => {
  it('names the outing and where it was', () => {
    expect(outingAlt({ title: 'Hike Mount Etna', area: 'Sicily', state: 'Italy' })).toBe(
      'Mount Etna, Sicily, Italy'
    )
  })

  it('normalizes state abbreviations and falls back', () => {
    expect(outingAlt({ title: null, area: null, state: 'CO' })).toBe('Colorado')
    expect(outingAlt({ title: null, area: null, state: null })).toBe('Photo from an outing')
  })
})
