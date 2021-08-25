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
      return field?.title[0].plain_text
    case 'date':
      return field?.date?.start
    case 'select':
      return field?.select?.name
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
      properties: { date, state, hike_title },
    } = result

    return {
      id,
      date: formatField(date),
      state: formatField(state),
      title: formatField(hike_title),
      href: url,
    }
  }, [])
}
