import { getSortedPostsData } from './data/posts'

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

export const findMatchingSlug = (str) => {
  const posts = getSortedPostsData()
  let foundPost = posts.find((post) => post.id == str)
  if (foundPost) {
    return str
  }
  return false
}
