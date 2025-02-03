const brands = [
  {
    name: 'Notion.so',
    href: 'https://notion.so',
    description:
      'A productivity app used for everything from personal note-taking to professional project management work. Fun fact: It powers almost every database used on this website. ✨',
  },
  {
    name: 'Keep Nature Wild',
    href: 'https://keepnaturewild.com',
    description:
      'An eco-minded outdoor brand that pledges to pick up 1lb of trash for every product sold.',
  },
  // {
  //   name: 'Goodr',
  //   href: 'https://goodr.com',
  //   description:
  //     'Extremely functional and affordable nonslip sunglasses made to be worn everywhere, from high peaks to the dog park to the local brewery.',
  // },
]

const interviews = [
  {
    name: 'Atomic Jolt',
    brandHref:
      'https://atomicjoltmedia.com/episodes/episode-013-kylie-czajkowski-on-hiking',
    embedHref: 'https://open.spotify.com/embed/episode/2ETzCeYr5s1vQGSn7z1lJB',
    description:
      'A podcast that explores small moments of lasting impact. In this episode, Kylie discusses finding balance in life through hiking, the importance of unplugging to avoid burnout, triumphs and lessons learned from hiking Fourteeners, mountain goats, and more.',
  },
]

const photoPrefix =
  'https://raw.githubusercontent.com/kale-stew/kale-stew.github.io/5aab633946526c276c50619bc9408801259a0bbc/public/img/'

const photos = [
  {
    src: `${photoPrefix}kyle-chasm.jpeg`,
    thumbnail: `${photoPrefix}kyle-chasm.jpeg`,
    thumbnailWidth: 400,
    thumbnailHeight: 412,
    caption:
      'Kylie and Kyle near their camp in the Longs boulderfield, in Rocky Mountain National Park. Chasm Lake is behind them.',
  },
  {
    src: `${photoPrefix}halo-ridge.jpeg`,
    thumbnail: `${photoPrefix}halo-ridge.jpeg`,
    thumbnailWidth: 300,
    thumbnailHeight: 400,
    caption:
      'Kylie looking at Mount of the Holy Cross from the Halo Ridge approach route.',
  },
  {
    src: 'https://live.staticflickr.com/65535/51795954743_fc94da17ee_c.jpg',
    thumbnail: 'https://live.staticflickr.com/65535/51795954743_fc94da17ee_c.jpg',
    thumbnailWidth: 246,
    thumbnailHeight: 341,
    caption: 'Kyle and Otis at the Great Sand Dunes National Park.',
  },
  {
    src: `${photoPrefix}otis-leaf.jpeg`,
    thumbnail: `${photoPrefix}otis-leaf.jpeg`,
    thumbnailWidth: 300,
    thumbnailHeight: 400,
    caption:
      'Otis, taking a break while on a walk through their old neighborhood in downtown Denver.',
  },
  {
    src: `https://live.staticflickr.com/65535/51857457747_79996b28b5_k.jpg`,
    thumbnail: `https://live.staticflickr.com/65535/51857457747_79996b28b5_k.jpg`,
    thumbnailWidth: 240,
    thumbnailHeight: 152,
    caption: 'Descending a boulderfield on the route back down Pyramid Peak.',
  },
]

export const fetchPersonalInformation = () => {
  return { brands, interviews, photos }
}
