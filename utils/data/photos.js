import { fmt, getDatabaseQueryConfig, notion } from '../notion'

/**
 * This is the notion config we need to query the all-photos database, see working examples in climbs.js
 * ex: let response = await notion.databases.query(photosConfig)
 */
const photosConfig = getDatabaseQueryConfig(null, null, process.env.NOTION_PHOTO_DATABASE_ID
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
 * Fetch an image from all-photos based on the linkedDatabase id
 * @param {String} id a notion id (l0ng-r4ndom-hash)
 * @returns {String} returns a flickr href
 * do we need this?
 */
const fetchRelatedImg = (id) => {}

/**
 * Fetch all images from the all-photos db
 * no params
 * returns an arr of images
 */
const fetchAllImages = () => {}

export { fetchAllImages, fetchRelatedImg }
