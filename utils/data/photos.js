import { buildAreaName, determineArea } from '../builders'
import { fmt, getDatabaseQueryConfig, notion } from '../notion'

const getPhotosConfig = (nextCursor = null) =>
  getDatabaseQueryConfig(nextCursor, null, process.env.NOTION_PHOTO_DATABASE_ID)
const photosSort = [{ property: 'taken_on', direction: 'descending' }]

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

    const photoArea = determineArea(area, area_fallback)

    return {
      id,
      area: buildAreaName(photoArea.region),
      state: photoArea.state,
      title: fmt(title),
      date: fmt(taken_on),
      href: fmt(href),
      width: fmt(width),
      height: fmt(height),
      bgColor: fmt(accent_color) ? fmt(accent_color) : null,
      tags: fmt(tags) ? fmt(tags) : null,
    }
  }, [])
}

const fetchAllImages = async () => {
  const photosConfig = getPhotosConfig()
  photosConfig.sorts = photosSort
  let response = await notion.databases.query(photosConfig)
  let responseArray = [...response.results]

  while (response.has_more) {
    // continue to query if next_cursor is returned
    const config = getPhotosConfig(response.next_cursor)
    config.sorts = photosSort
    response = await notion.databases.query(config)
    responseArray = [...responseArray, ...response.results]
  }
  responseArray = formatPhotos(responseArray)
  return responseArray
}

export { fetchAllImages }
