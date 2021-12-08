import path from 'path'

export const CATEGORY_TYPE = {
  GEAR: 'gear',
  HIKE: 'hike',
  THOUGHTS: 'thoughts'
}

export const gearDirectory = path.join(process.cwd(), `blog/${CATEGORY_TYPE.GEAR}`)
export const hikeDirectory = path.join(process.cwd(), `blog/${CATEGORY_TYPE.HIKE}`)
export const thoughtsDirectory = path.join(
  process.cwd(),
  `blog/${CATEGORY_TYPE.THOUGHTS}`
)

// TODO - more complex post calculation so it's agnostic to however many categories exist?
// export const BLOG_CATEGORIES = [
//   { title: CATEGORY_TYPE.GEAR, directory: gearDirectory },
//   { title: CATEGORY_TYPE.HIKE, directory: hikeDirectory },
//   { title: CATEGORY_TYPE.THOUGHTS, directory: thoughtsDirectory },
// ]

export const TABLE_SORT_ORDER = {
  ASC: 'ascending',
  DESC: 'descending',
}
