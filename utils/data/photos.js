import { fmt, getDatabaseQueryConfig, notion } from '../notion'

/**
 * This is the notion config we need to query the all-photos database.
 * See working examples in climbs.js.
 * ex: let response = await notion.databases.query(photosConfig)
 */
const photosConfig = getDatabaseQueryConfig(
  null,
  null,
  process.env.NOTION_PHOTO_DATABASE_ID,
  'taken_on'
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
      bgColor: fmt(accent_color) == undefined ? null : fmt(accent_color) ,
    }
    return finalObj
  }, [])
}

/**
 * Fetch all images from the all-photos db
 */
const fetchAllImages = async () => {
  photosConfig.sorts = [{ property: 'taken_on', direction: 'descending' }]
  let response = await notion.databases.query(photosConfig)
  let responseArray = [...response.results]
  
  while (response.has_more) {
    // response.has_more tells us if the database has more pages
    // response.next_cursor contains the next page of results,
    //    can be passed as the start_cursor param to the same endpoint
    const config = getDatabaseQueryConfig(
      response.next_cursor,
      null,
      process.env.NOTION_PHOTO_DATABASE_ID,
      'taken_on'
    )
    config.sorts = [{ property: 'taken_on', direction: 'descending' }]
    response = await notion.databases.query(config)
    responseArray = [...responseArray, ...response.results]
  }
  responseArray = formatPhotos(responseArray)
  return responseArray
}

export { fetchAllImages }
