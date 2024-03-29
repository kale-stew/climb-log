import { buildAreaName } from '../builders'
import { fmt, getDatabaseQueryConfig, notion } from '../notion'

const getPhotosConfig = (nextCursor = null) =>
  getDatabaseQueryConfig(nextCursor, null, process.env.NOTION_PHOTO_DATABASE_ID)
const photosSort = [{ property: 'taken_on', direction: 'descending' }]

const formatPhotos = (response) => {
  const determineArea = (area, area_fallback = null) => {
    let areaFormatted = fmt(area)
    let fallbackArea = fmt(area_fallback)
    if (areaFormatted && areaFormatted != '') {
      return {
        region: buildAreaName(areaFormatted.split(', ')[0]),
        state: areaFormatted.split(', ')[1],
      }
    } else if (fallbackArea && fallbackArea != '') {
      return {
        region: buildAreaName(fallbackArea.split(', ')[0]),
        state: fallbackArea.split(', ')[1],
      }
    }
    return {
      region: null,
      state: null,
    }
  }

  return response.map((result) => {
    const {
      id,
      properties: {
        area,
        area_fallback,
        exclude,
        height,
        href,
        tags,
        taken_on,
        title,
        width,
      },
    } = result

    const src = fmt(href)
    const photoArea = determineArea(area, area_fallback)
    const caption = `${fmt(title)}. ${photoArea.region}, ${photoArea.state}.`
    const fullWidth = fmt(width)
    const fullHeight = fmt(height)

    return {
      id,
      title: fmt(title),
      caption,
      src,
      thumbnail: src,
      area: buildAreaName(photoArea.region),
      state: photoArea.state,
      date: fmt(taken_on),
      width: fullWidth,
      thumbnailWidth: Math.round(fullWidth * 1e2),
      height: fullHeight,
      thumbnailHeight: Math.round(fullHeight * 1e2),
      searchTags: fmt(tags) ? fmt(tags) : null,
      exclude: fmt(exclude),
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
