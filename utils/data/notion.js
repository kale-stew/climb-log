import { Client, LogLevel } from '@notionhq/client'
import { getLocationData } from '../helpers'
import { getSortedPostsData } from './posts'

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
 * Massage data returned from the Notion API into a Table-friendly object
 */
const fmt = (field) => {
  if (field !== null) {
    switch (field.type) {
      case 'date':
        return field?.date?.start
      case 'file':
        return field?.file?.url
      case 'number':
        return field?.number
      case 'rich_text':
        return field?.rich_text[0]?.plain_text
      case 'title':
        return field?.title[0]?.plain_text
      case 'url':
        return field?.url
    }
  } else return null
}

const findMatchingSlug = (str) => {
  const posts = getSortedPostsData()
  let foundPost = posts.find((post) => post.id == str)
  if (foundPost) {
    return str
  }
  return false
}

/**
 * Formats an array of climbs returned from the Notion query
 */
const formatClimbs = (response) => {
  return response.map((result) => {
    const {
      id,
      properties: { area, date, distance, gain, hike_title, strava, related_slug },
    } = result

    const slug = findMatchingSlug(fmt(related_slug))
    const finalObj = {
      id,
      date: fmt(date),
      title: fmt(hike_title),
      slug: slug ? slug : null,
      previewImgUrl: fmt(result.cover),
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
export const fetchMostRecentClimbs = async () => {
  const config = getDatabaseQueryConfig(null, 2)
  config.sorts = [{ property: 'date', direction: 'descending' }]
  let response = await notion.databases.query(config)
  return formatClimbs(response.results)
}

/**
 * Fetch list of climbs from Notion db
 */
export const fetchAllClimbs = async () => {
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
