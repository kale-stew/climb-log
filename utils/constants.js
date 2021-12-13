import path from 'path'

export * from './socials'

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

export const METADATA = {
  NAME: 'Kylie Stewart',
  SITE_NAME: 'kylies.photos',
}

export const PARK_TYPES = {
  nf: 'National Forest',
  np: 'National Park',
  os: 'Open Space',
  ra: 'Recreation Area',
  rp: 'Regional Park',
  sp: 'State Park',
  wa: 'Wilderness',
}

export const ROLE_NAVIGATION = 'navigation'

export const TABLE_SORT_ORDER = {
  ASC: 'ascending',
  DESC: 'descending',
}
