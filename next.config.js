module.exports = {
  env: {
    NOTION_ACCESS_TOKEN: process.env.NOTION_ACCESS_TOKEN,
    NOTION_CLIMB_DATABASE_ID: process.env.NOTION_CLIMB_DATABASE_ID,
    NOTION_GEAR_DATABASE_ID: process.env.NOTION_GEAR_DATABASE_ID,
    NOTION_PEAK_DATABASE_ID: process.env.NOTION_PEAK_DATABASE_ID,
    NOTION_PHOTO_DATABASE_ID: process.env.NOTION_PHOTO_DATABASE_ID,
  },
  images: {
    remotePatterns: [{
      protocol: 'https',
      hostname: 's3.us-west-2.amazonaws.com',
      port: '',
      search: '',
    }, {
      protocol: 'https',
      hostname: 'live.staticflickr.com',
      port: '',
      search: '',
    }, {
      protocol: 'https',
      hostname: 'raw.githubusercontent.com',
      port: '',
      search: '',
    }]
  },
  async redirects() {
    return [
      {
        source: '/centennials',
        destination: '/peak-list',
        permanent: true,
      },
      {
        source: '/gear',
        destination: '/gear-list',
        permanent: true,
      },
    ]
  },
}
