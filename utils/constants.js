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

export const COLORS = {
  blue: '#2078ae',
  green: '#5f6e20',
  grey: '#3a3a3a',
  navy: '#11162b',
  teal: '#285f76',
  white: '#f1f1f1',
  yellow: '#bc8d02',
}

export const CONNECT = [
  { title: 'Instagram', href: 'https://www.instagram.com/kalestews/' },
  { title: 'AllTrails', href: 'https://www.alltrails.com/members/kylie-stewart-1' },
  { title: 'Strava', href: 'https://www.strava.com/athletes/46336787' },
  {
    title: '14ers.com',
    href: 'https://www.14ers.com/forum/memberlist.php?mode=viewprofile&u=87761',
  },
  { title: 'Flickr', href: 'https://flickr.com/photos/189863825@N02/' },
  { title: 'Twitter', href: 'https://twitter.com/kyliestew' },
]

export const EXPLORE = [
  { title: 'Home', href: '/' },
  // { title: 'My Gear', href: '/gear' },
  { title: 'Climb Log', href: '/climb-log' },
  { title: 'Trip Reports', href: `/blog?${CATEGORY_TYPE.HIKE}` },
  { title: 'All Photos', href: '/all' },
  { title: 'About Kylie', href: '/about' },
]

export const METADATA = {
  FIRST_NAME: 'Kylie',
  FULL_NAME: 'Kylie Stewart',
  SITE_NAME: 'kylies.photos',
}

export const PREVIEW_IMAGES = {
  ABOUT_IMAGE: 'https://live.staticflickr.com/65535/51791228456_aa3e462b7f_k.jpg',
  ALL_PHOTOS_IMAGE: 'https://live.staticflickr.com/65535/51795083133_aede34b83c_b.jpg',
  BLOG_FALLBACK_IMAGE: 'https://live.staticflickr.com/65535/51716926587_ba8bbedd69_b.jpg',
  CLIMB_LOG_IMAGE: 'https://live.staticflickr.com/65535/51789832732_041ee645fa_k.jpg',
  FALLBACK_IMAGE: 'https://live.staticflickr.com/65535/51721573796_c2143acb54_b.jpg',
  HOME_IMAGE: 'https://live.staticflickr.com/65535/51793981577_eef09b49f5_c.jpg',
  NOT_FOUND_IMAGE: 'https://live.staticflickr.com/65535/51789853637_0e1329495c_b.jpg',
}

export const REFERRALS = [
  { title: 'AllTrails Pro', href: 'https://www.alltrails.com/invite/N0NW0I' },
]

export const ROLE_NAVIGATION = 'navigation'

export const TABLE_SORT_ORDER = {
  ASC: 'ascending',
  DESC: 'descending',
}
