import { Client, LogLevel } from '@notionhq/client'
import { getLocationData } from './helpers'

/**
 * Initialize Notion client & configure a default db query
 */
const notion = new Client({
  auth: process.env.NOTION_ACCESS_TOKEN,
  logLevel: LogLevel.DEBUG,
})

/**
 * Builds our database config for us
 * @param {String} cursor 
 * @param {Number} pageSize 
 * @returns 
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
 * Massage data returned from the Notion API
 * into a Table-friendly object
 */
const fmt = (field) => {
  if (field !== null) {
    switch (field.type) {
      case 'date':
        return field?.date?.start
      case 'number':
        return field?.number
      case 'rich_text':
        return field?.rich_text[0]?.plain_text
      case 'title':
        return field?.title[0]?.plain_text
      case 'url':
        return field?.url
      case 'file':
        return field?.file?.url
    }
  } else return null
}

/**
 * Formats an array of climbs from a notion.database.query response, should be the response.results
 * @param {Array} response 
 * @returns {Array}
 */
const formatClimbs = (response) => response.map((result) => {
  const {
    id,
    properties: { area, date, distance, gain, hike_title, strava },
  } = result

  return {
    id,
    date: fmt(date),
    title: fmt(hike_title),
    // slug: url,
    imgUrl: fmt(result.cover),
    distance: fmt(distance),
    gain: fmt(gain),
    area: getLocationData(fmt(area)).area,
    state: getLocationData(fmt(area)).state,
    strava: fmt(strava),
  }
}, [])

/**
 * 
 * @returns {Array} with the 3 most recent climbs
 */
export const fetchMostRecentClimbs = async () => {
  const config = getDatabaseQueryConfig(null, 3)
  config.sorts = [{ property: 'date', direction: 'descending' }]
  let response = await notion.databases.query(config)
  return formatClimbs(response.results)
}

/**
 * Fetch list of climbs from Notion db
 * @returns {Array}
 */
export const fetchAllClimbs = async () => {
  const config = getDatabaseQueryConfig()
  config.sorts = [{ property: 'date', direction: 'descending' }]
  let response = await notion.databases.query(config)
  let responseArray = [...response.results]
  while (response.has_more) {
    const config = getDatabaseQueryConfig(response.next_cursor)
    config.sorts = [{ property: 'date', direction: 'descending' }]
    response = await notion.databases.query(config)
    responseArray = [...responseArray, ...response.results]
  }
  //response.has_more // <-- This will tell us if the database has more pages 
  //response.next_cursor // <-- This is the next page of results, can be passed as the start_cursor parameter to the same endpoint
  return formatClimbs(responseArray)
}

/**
 * Filter by an input str (Search functionality)
 */
export const fetchClimbsBySearchQuery = async (/* str */) => {}
