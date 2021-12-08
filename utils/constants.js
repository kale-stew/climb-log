import path from 'path'

export const TABLE_SORT_ORDER = {
  ASC: 'ascending',
  DESC: 'descending',
}

export const CATEGORY_TYPE = {
  GEAR: 'gear',
  THOUGHTS: 'thoughts',
  HIKE: 'hike',
}

export const gearDirectory = path.join(process.cwd(), `blog/${CATEGORY_TYPE.GEAR}`)
export const hikeDirectory = path.join(process.cwd(), `blog/${CATEGORY_TYPE.HIKE}`)
export const thoughtsDirectory = path.join(
  process.cwd(),
  `blog/${CATEGORY_TYPE.THOUGHTS}`
)

// TODO - more complex post calculation so it's agnostic to however many categories exist?
// export const CATEGORIES = [
//   { title: 'hike', directory: path.join(process.cwd(), 'blog/hike') },
//   { title: 'thoughts', directory: path.join(process.cwd(), 'blog/thoughts') },
//   { title: 'gear', directory: path.join(process.cwd(), 'blog/gear') },
// ]
