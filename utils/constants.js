import path from 'path'

export const TABLE_SORT_ORDER = {
  DEFAULT: 'descending',
  ASC: 'ascending',
  DESC: 'descending',
}

export const gearCategory = 'gear'
export const gearDirectory = path.join(process.cwd(), 'blog/gear')

export const thoughtsCategory = 'thoughts'
export const thoughtsDirectory = path.join(process.cwd(), 'blog/thoughts')

export const hikeCategory = 'hike'
export const hikeDirectory = path.join(process.cwd(), 'blog/hike')

// TODO - more complex post calculation so it's agnostic to however many categories exist?
// export const CATEGORIES = [
//   { title: 'hike', directory: path.join(process.cwd(), 'blog/hike') },
//   { title: 'thoughts', directory: path.join(process.cwd(), 'blog/thoughts') },
//   { title: 'gear', directory: path.join(process.cwd(), 'blog/gear') },
// ]
