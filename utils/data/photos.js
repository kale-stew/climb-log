import { fmt, getDatabaseQueryConfig, notion } from '../notion'

/**
 * This is the notion config we need to query the all-photos database.
 * See working examples in climbs.js.
 * ex: let response = await notion.databases.query(photosConfig)
 */
const photosConfig = getDatabaseQueryConfig(
  null,
  null,
  process.env.NOTION_PHOTO_DATABASE_ID
)

/**
 * Formats an array of photos returned from the Notion query
 */
const formatPhotos = (response) => {
  return response.map((result) => {
    const {
      id,
      properties: { accent_color, height, href, taken_on, title, width },
    } = result

    const finalObj = {
      id,
      title: fmt(title),
      date: fmt(taken_on),
      href: fmt(href),
      width: fmt(width),
      height: fmt(height),
      bgColor: fmt(accent_color),
    }
    return finalObj
  }, [])
}

/**
 * Fetch all images from the all-photos db
 */
const fetchAllImages = () => {}

export { fetchAllImages, fetchRelatedImg }
