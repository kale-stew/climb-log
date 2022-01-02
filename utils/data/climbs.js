// TODO: rename this file to climbs.js
// dependent on whether or not we can substantiate the notion client in a 2nd file
//   → if impossible, can we make an agnostic notion.js to be consumed by climbs.js and photos.js?

import { Client, LogLevel } from '@notionhq/client'
import { fmt, findMatchingSlug } from '../notion'
import { getLocationData } from '../helpers'

/**
 * Initialize Notion client & configure a default db query
 */
const notion = new Client({
  auth: process.env.NOTION_ACCESS_TOKEN,
  logLevel: LogLevel.DEBUG,
})

/**
 * Builds our database config
 */
const getDatabaseQueryConfig = (cursor = null, pageSize = null) => {
  let today = new Date().toISOString()
  const config = {
    database_id: process.env.NOTION_DATABASE_ID,
    filter: {
      and: [{ property: 'date', date: { on_or_before: today } }],
    },
  }

  if (cursor != null) {
    config['start_cursor'] = cursor
  }

  if (pageSize != null) {
    config['page_size'] = pageSize
  }

  return config
}

/**
 * Formats an array of climbs returned from the Notion query
 */
const formatClimbs = (response) => {
  return response.map((result) => {
    const {
      id,
      properties: {
        area,
        date,
        distance,
        fallback_img,
        gain,
        hike_title,
        strava,
        related_slug,
      },
    } = result

    const slug = findMatchingSlug(fmt(related_slug))
    const finalObj = {
      id,
      date: fmt(date),
      title: fmt(hike_title),
      slug: slug ? slug : null,
      previewImgUrl: fallback_img
        ? fmt(fallback_img)
        : result.cover
        ? fmt(result.cover)
        : null,
      distance: fmt(distance),
      gain: fmt(gain),
      area: getLocationData(fmt(area)).area,
      state: getLocationData(fmt(area)).state,
      strava: fmt(strava),
    }
    return finalObj
  }, [])
}

/**
 * Fetch an array of the 3 most recent climbs logged to be
 * featured on the home page
 */
const fetchMostRecentClimbs = async () => {
  const config = getDatabaseQueryConfig(null, 3)
  config.sorts = [{ property: 'date', direction: 'descending' }]
  let response = await notion.databases.query(config)
  return formatClimbs(response.results)
}

/**
 * Fetch list of climbs from Notion db
 */
const fetchAllClimbs = async () => {
  const config = getDatabaseQueryConfig()
  config.sorts = [{ property: 'date', direction: 'descending' }]
  let response = await notion.databases.query(config)
  let responseArray = [...response.results]

  while (response.has_more) {
    // response.has_more tells us if the database has more pages
    // response.next_cursor contains the next page of results,
    //    can be passed as the start_cursor param to the same endpoint
    const config = getDatabaseQueryConfig(response.next_cursor)
    config.sorts = [{ property: 'date', direction: 'descending' }]
    response = await notion.databases.query(config)
    responseArray = [...responseArray, ...response.results]
  }

  return formatClimbs(responseArray)
}

export { fetchAllClimbs, fetchMostRecentClimbs }
