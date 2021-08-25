import { Client, LogLevel } from '@notionhq/client'
import { formatDate, formatElevation } from './helpers'

/**
 * Initialize Notion client & configure a default db query
 */
const notion = new Client({ auth: process.env.NOTION_KEY, logLevel: LogLevel.DEBUG })
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

const formatField = (field) => {
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
      url,
      properties: { date, area, high_point, hike_title, strava },
    } = result

    return {
      id,
      href: url,
      date: formatDate(formatField(date)),
      title: formatField(hike_title),
      elevation: formatElevation(formatField(high_point)),
      location: formatField(area),
      strava: formatField(strava),
    }
  }, [])
}
