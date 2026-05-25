module.exports = {
  env: {
    NOTION_TOKEN: process.env.NOTION_TOKEN,
    NOTION_CLIMBS_DB_ID: process.env.NOTION_CLIMBS_DB_ID,
    NOTION_GEAR_DB_ID: process.env.NOTION_GEAR_DB_ID,
    NOTION_PEAKS_DB_ID: process.env.NOTION_PEAKS_DB_ID,
    NOTION_PHOTOS_DB_ID: process.env.NOTION_PHOTOS_DB_ID,
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
