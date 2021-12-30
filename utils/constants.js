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
  { title: 'My Gear', href: '/gear' },
  { title: 'About Kylie', href: '/about' },
  { title: 'Climb Log', href: '/climb-log' },
  { title: 'Trip Reports', href: `/blog?${CATEGORY_TYPE.HIKE}` },
]

export const REFERRALS = [
  { title: 'AllTrails Pro', href: 'https://www.alltrails.com/invite/N0NW0I' },
]

export const METADATA = {
  NAME: 'Kylie Stewart',
  SITE_NAME: 'kylies.photos',
}

export const ROLE_NAVIGATION = 'navigation'

export const TABLE_SORT_ORDER = {
  ASC: 'ascending',
  DESC: 'descending',
}
