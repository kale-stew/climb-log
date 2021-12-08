module.exports = {
  target: 'serverless',
  env: {
    NOTION_ACCESS_TOKEN: process.env.NOTION_ACCESS_TOKEN,
    NOTION_DATABASE_ID: process.env.NOTION_DATABASE_ID,
  },
  images: {
    domains: ['s3.us-west-2.amazonaws.com'],
  },
}
