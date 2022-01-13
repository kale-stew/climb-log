import { fmt, findMatchingSlug, getDatabaseQueryConfig, notion } from '../notion'
import { getLocationData } from '../helpers'

let today = new Date().toISOString()
const climbSorts = [{ property: 'date', direction: 'descending' }]
const climbFilters = {
  and: [{ property: 'date', date: { on_or_before: today } }],
}

const formatClimbs = (response) => {
  return response.map((result) => {
    const {
      id,
      properties: {
        area,
        date,
        distance,
        gain,
        hike_title,
        strava,
        related_img,
        related_slug,
      },
    } = result

    const slug = findMatchingSlug(fmt(related_slug))
    let previewImg = fmt(related_img)
    if (previewImg == '') {
      previewImg = result.cover ? fmt(result.cover) : null
    }

    return {
      id,
      date: fmt(date),
      title: fmt(hike_title),
      slug: slug ? slug : null,
      previewImgUrl: previewImg,
      distance: fmt(distance),
      gain: fmt(gain),
      area: getLocationData(fmt(area)).area,
      state: getLocationData(fmt(area)).state,
      strava: fmt(strava),
    }
  }, [])
}

/**
 * Fetch an array of the 3 most recent climbs logged to be
 * featured on the home page
 */
const fetchMostRecentClimbs = async () => {
  const config = getDatabaseQueryConfig(null, 5)
  config.sorts = climbSorts
  config.filter = climbFilters
  let response = await notion.databases.query(config)
  return formatClimbs(response.results)
}

/**
 * Fetch list of climbs from Notion db
 */
const fetchAllClimbs = async () => {
  const config = getDatabaseQueryConfig()
  config.sorts = climbSorts
  config.filter = climbFilters
  let response = await notion.databases.query(config)
  let responseArray = [...response.results]

  while (response.has_more) {
    // continue to query if next_cursor is returned
    const config = getDatabaseQueryConfig(response.next_cursor)
    config.sorts = climbSorts
    config.filter = climbFilters
    response = await notion.databases.query(config)
    responseArray = [...responseArray, ...response.results]
  }

  return formatClimbs(responseArray)
}

export { fetchAllClimbs, fetchMostRecentClimbs }
