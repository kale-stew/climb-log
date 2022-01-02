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
 * Massage data returned from the Notion API into a Table-friendly object
 */
export const fmt = (field) => {
  if (field !== null) {
    switch (field.type) {
      case 'date':
        return field?.date?.start
      case 'file':
        return field?.file?.url
      case 'formula':
        if (field?.formula?.string || field?.formula?.string == '') {
          return field?.formula?.string
        } else {
          console.warn(
            field?.formula?.string == '',
            "Hey 👋 Looks like we are using a formula that isn't evaluated to a string. We need to update the fmt function in notion.js"
          )
          return null
        }
      case 'number':
        return field?.number
      case 'relation':
        // TODO: things if we need to use the entire relation
        console.warn(
          "We haven't set up the relation case in the fmt function in notion.js"
        )
        return ''
      case 'rich_text':
        return field?.rich_text[0]?.plain_text
      case 'title':
        return field?.title[0]?.plain_text
      case 'url':
        return field?.url
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
  database_id = process.env.NOTION_CLIMB_DATABASE_ID,
  dateProperty = 'date'
) => {
  let today = new Date().toISOString()
  const config = {
    database_id,
    filter: {
      and: [{ property: dateProperty, date: { on_or_before: today } }],
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
