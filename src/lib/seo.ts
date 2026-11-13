// Shared identity and structured data for search engines.
// Keep sameAs to profiles Kylie controls; search engines use it to tie them to one person.

export const SITE_URL = 'https://kylies.photos'
export const SITE_NAME = 'kylies.photos'
export const AUTHOR_NAME = 'Kylie Czajkowski'

const PERSON_ID = `${SITE_URL}/#person`
const WEBSITE_ID = `${SITE_URL}/#website`

export const person = {
  '@type': 'Person',
  '@id': PERSON_ID,
  name: AUTHOR_NAME,
  givenName: 'Kylie',
  familyName: 'Czajkowski',
  url: `${SITE_URL}/about`,
  image: `${SITE_URL}/open-graph/about.jpg`,
  jobTitle: 'Engineering manager',
  sameAs: [
    'https://kylieis.online',
    'https://github.com/kale-stew',
    'https://www.instagram.com/kalestewski/',
    'https://www.strava.com/athletes/46336787',
    'https://x.com/kyliestew',
  ],
}

export const website = {
  '@type': 'WebSite',
  '@id': WEBSITE_ID,
  url: SITE_URL,
  name: SITE_NAME,
  description: 'Hiking, climbing, and mountain photos from Kylie Czajkowski.',
  inLanguage: 'en-US',
  author: { '@id': PERSON_ID },
  publisher: { '@id': PERSON_ID },
}

export const personRef = { '@id': PERSON_ID }
export const websiteRef = { '@id': WEBSITE_ID }

export type JsonLdNode = Record<string, unknown>

/** One @graph per page: the site-wide WebSite and Person nodes plus any page-specific nodes. */
export function jsonLdGraph(nodes: JsonLdNode[] = []): string {
  const graph = { '@context': 'https://schema.org', '@graph': [website, person, ...nodes] }
  // Escape "<" so content can never close the surrounding <script> tag.
  return JSON.stringify(graph).replace(/</g, '\\u003c')
}

export function absoluteUrl(pathOrUrl: string): string {
  return new URL(pathOrUrl, SITE_URL).toString()
}

/**
 * A plain-text description from the first real paragraph of a Markdown body,
 * cut at a word boundary. Returns null when the body has no usable prose.
 */
export function excerptFromMarkdown(body: string | undefined, maxLength = 155): string | null {
  if (!body) return null
  const paragraph = body
    .split(/\n\s*\n/)
    .map(block => block.trim())
    .find(block => block && !/^(#|!\[|<|>|```|\||- |\* |\d+\. )/.test(block))
  if (!paragraph) return null
  const text = paragraph
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[*_`]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  if (text.length <= maxLength) return text
  const cut = text.slice(0, maxLength - 1)
  const lastSpace = cut.lastIndexOf(' ')
  return `${(lastSpace > 80 ? cut.slice(0, lastSpace) : cut).replace(/[,;:.\s]+$/, '')}…`
}
