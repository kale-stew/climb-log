import { buildAreaName } from '../builders'
import { fmt, getDatabaseQueryConfig, notion } from '../notion'

/**
 * This is the notion config we need to query the all-photos database.
 * See working examples in climbs.js.
 * ex: let response = await notion.databases.query(photosConfig)
 */
const getPhotosConfig = (nextCursor = null) =>
  getDatabaseQueryConfig(
    nextCursor,
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
      properties: {
        accent_color,
        area,
        area_fallback,
        height,
        href,
        tags,
        taken_on,
        title,
        width,
      },
    } = result

    const determinePhotoArea = () => {
      let areaFormatted = fmt(area)
      let fallbackArea = fmt(area_fallback)
      if (areaFormatted && areaFormatted != '') {
        return {
          region: areaFormatted.split(', ')[0],
          state: areaFormatted.split(', ')[1],
        }
      } else if (fallbackArea && fallbackArea != '') {
        return {
          region: fallbackArea.split(', ')[0],
          state: fallbackArea.split(', ')[1],
        }
      }

      return {
        region: null,
        state: null,
      }
    }

    const finalObj = {
      id,
      area: buildAreaName(determinePhotoArea().region),
      state: determinePhotoArea().state,
      title: fmt(title),
      date: fmt(taken_on),
      href: fmt(href),
      width: fmt(width),
      height: fmt(height),
      bgColor: fmt(accent_color) ? fmt(accent_color) : null,
      tags: fmt(tags) ? fmt(tags) : null,
    }
    return finalObj
  }, [])
}

/**
 * Fetch all images from the all-photos db
 */
const fetchAllImages = async () => {
  const photosConfig = getPhotosConfig()
  photosConfig.sorts = [{ property: 'taken_on', direction: 'descending' }]
  let response = await notion.databases.query(photosConfig)
  let responseArray = [...response.results]

  while (response.has_more) {
    // continue to query if next_cursor is returned
    const config = getPhotosConfig(response.next_cursor)
    config.sorts = [{ property: 'taken_on', direction: 'descending' }]
    response = await notion.databases.query(config)
    responseArray = [...responseArray, ...response.results]
  }
  responseArray = formatPhotos(responseArray)
  return responseArray
}

export { fetchAllImages }
