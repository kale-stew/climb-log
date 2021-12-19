import path from 'path'

export const AREA_TYPE = {
  nf: 'National Forest',
  np: 'National Park',
  os: 'Open Space',
  ra: 'Recreation Area',
  rp: 'Regional Park',
  sp: 'State Park',
  wa: 'Wilderness',
}

export const BRANDS = [
  {
    name: 'Keep Nature Wild',
    href: 'https://keepnaturewild.com',
    description:
      'An eco-minded outdoor brand that promises to pick up 1lb of trash for every product sold.',
  },
  {
    name: 'Notion.so',
    href: 'https://notion.so',
    description:
      'A productivity app used for everything from personal note-taking to professional project management work. Fun fact: the climb log on this website is built using it!',
  },
]

export const CATEGORY_TYPE = {
  ALL: 'all',
  GEAR: 'gear',
  HIKE: 'hike',
  THOUGHTS: 'thoughts',
}

// TODO - more complex post calculation so it's agnostic to however many categories exist?
export const gearDirectory = path.join(process.cwd(), `blog/${CATEGORY_TYPE.GEAR}`)
export const hikeDirectory = path.join(process.cwd(), `blog/${CATEGORY_TYPE.HIKE}`)
export const thoughtsDirectory = path.join(
  process.cwd(),
  `blog/${CATEGORY_TYPE.THOUGHTS}`
)

export const LINKS_URL =
  'https://raw.githubusercontent.com/kale-stew/kale-stew.github.io/dev/src/data/socials.json'

export const METADATA = {
  NAME: 'Kylie Stewart',
  SITE_NAME: 'kylies.photos',
}

export const ROLE_NAVIGATION = 'navigation'

export const TABLE_SORT_ORDER = {
  ASC: 'ascending',
  DESC: 'descending',
}
