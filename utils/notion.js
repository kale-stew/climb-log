import { Client, LogLevel } from '@notionhq/client'

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
    sorts: [{ property: 'date', direction: 'descending' }],
    // page_size: 30, // @TODO - Add pagination
  }

  return config
}

const formatField = (field) => {
  switch (field.type) {
    case 'title':
      return field?.title[0]?.plain_text
    case 'date':
      return field?.date?.start
    case 'rich_text':
      return field?.rich_text[0]?.plain_text
    case 'number':
      return field?.number
  }
}

/**
 * Fetch list of climbs from Notion db
 */
export const fetchAllClimbs = async () => {
  const config = getDatabaseQueryConfig()
  let response = await notion.databases.query(config)

  return response.results.map((result) => {
    const {
      id,
      url,
      properties: { date, area, hike_title, high_point },
    } = result

    return {
      id,
      href: url,
      date: formatField(date),
      title: formatField(hike_title),
      elevation: formatField(high_point),
      location: formatField(area),
    }
  }, [])
}
