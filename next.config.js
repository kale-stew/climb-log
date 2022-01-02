module.exports = {
  target: 'serverless',
  env: {
    NOTION_ACCESS_TOKEN: process.env.NOTION_ACCESS_TOKEN,
    NOTION_CLIMB_DATABASE_ID: process.env.NOTION_CLIMB_DATABASE_ID,
    NOTION_PHOTO_DATABASE_ID: process.env.NOTION_PHOTO_DATABASE_ID,
  },
  images: {
    domains: ['s3.us-west-2.amazonaws.com', 'live.staticflickr.com'],
  },
}
