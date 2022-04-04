export const METADATA = {
  FIRST_NAME: 'Kylie',
  FULL_NAME: 'Kylie Czajkowski',
  SITE_NAME: 'kylies.photos',
  SOURCE_CODE: 'https://github.com/kale-stew/climb-log',
  TWITTER_HANDLE: 'kyliestew',
}

export const ALL_MONTHS = [
  'JANUARY',
  'FEBRUARY',
  'MARCH',
  'APRIL',
  'MAY',
  'JUNE',
  'JULY',
  'AUGUST',
  'SEPTEMBER',
  'OCTOBER',
  'NOVEMBER',
  'DECEMBER',
]

export const AREA_TYPE = {
  NF: 'National Forest',
  NP: 'National Park',
  OS: 'Open Space',
  RA: 'Recreation Area',
  RP: 'Regional Park',
  SP: 'State Park',
  WA: 'Wilderness',
}

export const BRANDS = [
  {
    name: 'Goodr',
    href: 'https://goodr.com',
    description:
      'Extremely functional and affordable nonslip sunglasses made to be worn everywhere, from high peaks to the dog park to the local brewery.',
  },
  {
    name: 'Notion.so',
    href: 'https://notion.so',
    description:
      'A productivity app used for everything from personal note-taking to professional project management work. Fun fact: the climb log on this website is built using it!',
  },
  {
    name: 'Keep Nature Wild',
    href: 'https://keepnaturewild.com',
    description:
      'An eco-minded outdoor brand that pledges to pick up 1lb of trash for every product sold.',
  },
]

export const CATEGORY_TYPE = {
  ALL: 'all',
  GEAR: 'gear',
  HIKE: 'hike',
  THOUGHTS: 'thoughts',
}

export const CONNECT = [
  { title: 'Instagram', href: 'https://www.instagram.com/kalestewski/' },
  { title: 'AllTrails', href: 'https://www.alltrails.com/members/kylie-stewart-1' },
  { title: 'Strava', href: 'https://www.strava.com/athletes/46336787' },
  {
    title: '14ers.com',
    href: 'https://www.14ers.com/forum/memberlist.php?mode=viewprofile&u=87761',
  },
  { title: 'Flickr', href: 'https://flickr.com/photos/189863825@N02/' },
  { title: 'Twitter', href: `https://twitter.com/${METADATA.TWITTER_HANDLE}` },
]

export const CONTACT_ENDPOINT =
  'https://public.herotofu.com/v1/528dd450-728b-11ec-b2d5-af79f33d926c'

export const EXPLORE = [
  { title: 'Home', href: '/' },
  { title: 'Centennial Summits', href: '/centennials' },
  { title: 'Climb Log', href: '/climb-log' },
  { title: 'Trip Reports', href: `/blog?${CATEGORY_TYPE.HIKE}` },
  { title: 'Gear List', href: '/gear-list' },
  { title: 'All Photos', href: '/all' },
  { title: 'About Kylie', href: '/about' },
]

export const DESKTOP_NAV = [
  { name: 'Blog', href: 'blog' },
  { name: 'Climb Log', href: 'climb-log' },
  { name: 'Peaks', href: 'peak-list' },
  { name: 'About', href: 'about' },
]

export const MOBILE_NAV = [
  { name: 'Blog', href: 'blog' },
  { name: 'Climb Log', href: 'climb-log' },
  { name: 'Centennials List', href: 'peak-list' },
  { name: 'Gear List', href: 'gear-list' },
  { name: 'All Photos', href: 'all' },
  { name: 'About', href: 'about' },
]

export const PREVIEW_CARD_COLORS = {
  blue: '#2078ae',
  green: '#5f6e20',
  grey: '#3a3a3a',
  navy: '#11162b',
  teal: '#285f76',
  white: '#f1f1f1',
  yellow: '#bc8d02',
}

export const PREVIEW_IMAGES = {
  ABOUT_IMAGE: 'https://live.staticflickr.com/65535/51791228456_aa3e462b7f_k.jpg',
  ALL_PHOTOS_IMAGE: 'https://live.staticflickr.com/65535/51795083133_aede34b83c_b.jpg',
  BLOG_FALLBACK_IMAGE: 'https://live.staticflickr.com/65535/51716926587_ba8bbedd69_b.jpg',
  CLIMB_LOG_IMAGE: 'https://live.staticflickr.com/65535/51789832732_041ee645fa_k.jpg',
  FALLBACK_IMAGE: 'https://live.staticflickr.com/65535/51721573796_c2143acb54_b.jpg',
  GEAR_IMAGE: 'https://live.staticflickr.com/65535/51808301878_d84546f4a4_b.jpg',
  HOME_IMAGE: 'https://live.staticflickr.com/65535/51892023599_f53cf9a763_b.jpg',
  NOT_FOUND_IMAGE: 'https://live.staticflickr.com/65535/51789853637_0e1329495c_b.jpg',
  PEAK_LIST_IMAGE: 'https://live.staticflickr.com/65535/51795118588_6c8c161b51_b.jpg',
}

export const REFERRALS = [
  { title: 'AllTrails Pro', href: 'https://www.alltrails.com/invite/N0NW0I' },
]

export const TABLE_SORT_ORDER = {
  ASC: 'ascending',
  DESC: 'descending',
}

export const THIRTEENERS = '13ers'
export const FOURTEENERS = '14ers'
