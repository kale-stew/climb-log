import { getSortedPostsData } from './data/posts'
import { Client, LogLevel } from '@notionhq/client'

/**
 * Initialize Notion client & configure a default db query
 */
export const notion = new Client({
  auth: process.env.NOTION_ACCESS_TOKEN,
  logLevel: LogLevel.DEBUG,
})

/**
 * Specifically for the formula response from notion, as it always has a .type key
 * @param {Object} data Notion API Formula response object
 * @returns {Any} returns the corresponding data type of formula.type or null
 */
const formatFormulaType = (data) => {
  switch (data?.formula?.type) {
    case 'string':
      return data?.formula?.string
    case 'number':
      return data?.formula?.number
    default:
      console.warn(
        `👋 ${data.formula.type} doesn't evaluate to a string or number. We need to update the formatFormulaType fn → notion.js  `
      )
      return null
  }
}

/**
 * Massage data returned from the Notion API into a Table-friendly object
 */
export const fmt = (field) => {
  if (field !== null) {
    switch (field.type) {
      case 'date':
        return field?.date?.start || null
      case 'file':
        return field?.file?.url
      case 'files':
        return field?.files.length > 0 ? field?.files[0].file?.url : null
      case 'formula':
        return formatFormulaType(field)
      case 'multi_select':
        return field?.multi_select
      case 'number':
        return field?.number
      case 'relation':
        console.warn(
          "👋 We haven't set this relation case up in the `fmt` function yet. We need to update it → notion.js"
        )
        return null
      case 'rich_text':
        return field?.rich_text.length > 0 ? field?.rich_text[0]?.plain_text : null
      case 'select':
        return field?.select?.name
      case 'title':
        return field?.title[0]?.plain_text
      case 'url':
        return field?.url
      default:
        console.warn(
          `👋 ${field.type} isn't in the fmt function yet. We need to update it → notion.js`
        )
        return null
    }
  } else return null
}

export const findMatchingSlug = (str) => {
  const posts = getSortedPostsData()
  let foundPost = posts.find((post) => post.id == str)
  if (foundPost) {
    return str
  }
  return false
}

export const getDatabaseQueryConfig = (
  cursor = null,
  pageSize = null,
  database_id = process.env.NOTION_CLIMB_DATABASE_ID
) => {
  const config = {
    database_id,
  }

  if (cursor != null) {
    config['start_cursor'] = cursor
  }

  if (pageSize != null) {
    config['page_size'] = pageSize
  }

  return config
}
