import { Client, LogLevel } from '@notionhq/client'
import { formatDate, getLocationData } from './helpers'

/**
 * Initialize Notion client & configure a default db query
 */
const notion = new Client({
  auth: process.env.NOTION_ACCESS_TOKEN,
  logLevel: LogLevel.DEBUG,
})
const getDatabaseQueryConfig = () => {
  let today = new Date().toISOString()

  const config = {
    database_id: process.env.NOTION_DATABASE_ID,
    filter: {
      and: [{ property: 'date', date: { on_or_before: today } }],
    },
  }

  return config
}

/**
 * Massage data returned from the Notion API
 * into a Table-friendly object
 */
const fmt = (field) => {
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
  }
}

/**
 * Fetch list of climbs from Notion db
 */
export const fetchAllClimbs = async () => {
  const config = getDatabaseQueryConfig()
  config.sorts = [{ property: 'date', direction: 'descending' }]
  let response = await notion.databases.query(config)

  return response.results.map((result) => {
    const {
      id,
      properties: { area, date, distance, gain, hike_title },
    } = result

    return {
      id,
      date: formatDate(fmt(date)),
      title: fmt(hike_title),
      // slug: url,
      distance: fmt(distance),
      gain: fmt(gain),
      area: getLocationData(fmt(area)).area,
      state: getLocationData(fmt(area)).state,
    }
  }, [])
}

/**
 * Filter by a 'Select' option
 */
export const fetchClimbsByFilter = async () => {}

/**
 * Filter by an input str (Search functionality)
 */
export const fetchClimbsBySearchQuery = async (/* str */) => {}

/**
 * Fetch a single climb's data
 */
export const fetchClimbData = async (/* id */) => {}
