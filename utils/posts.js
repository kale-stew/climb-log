import fs from 'fs'
import matter from 'gray-matter'
import path from 'path'
import { buildAreaName } from './builders'
import { CATEGORY_TYPE, PREVIEW_IMAGES } from './constants'
import { addCommas, capitalizeEachWord } from './helpers'
import { fetchMostRecentClimbs } from './notion'

export const gearDirectory = path.join(process.cwd(), `blog/${CATEGORY_TYPE.GEAR}`)
export const hikeDirectory = path.join(process.cwd(), `blog/${CATEGORY_TYPE.HIKE}`)
export const thoughtsDirectory = path.join(
  process.cwd(),
  `blog/${CATEGORY_TYPE.THOUGHTS}`
)
const postsDirectory = path.join(process.cwd(), 'blog')

// Get all the post IDs
export function getAllPostIds() {
  // Get file names under each categories directory
  const gearFileNames = fs.readdirSync(gearDirectory)
  const thoughtsFileNames = fs.readdirSync(thoughtsDirectory)
  const tripReportsFileNames = fs.readdirSync(hikeDirectory)

  // Holds all [category] names
  let categoryNames = []

  // Loop through each xxxFileNames array.
  // Add relevant category name to categoryNames array
  gearFileNames.forEach(function (gearFileName) {
    categoryNames.push(CATEGORY_TYPE.GEAR)
  })
  thoughtsFileNames.forEach(function (thoughtsFileName) {
    categoryNames.push(CATEGORY_TYPE.THOUGHTS)
  })
  tripReportsFileNames.forEach(function (tripReportsFileName) {
    categoryNames.push(CATEGORY_TYPE.HIKE)
  })

  // Concatenate each articles name in one array (id)
  const fileNames = gearFileNames.concat(thoughtsFileNames).concat(tripReportsFileNames)

  // Combine categoryNames & fileNames arrays
  const postParams = categoryNames.map(function (e, i) {
    return { categoryName: e, id: fileNames[i] }
  })

  // Loop through postParams. Output variable params
  return postParams.map((postParam) => {
    return {
      params: {
        category: postParam.categoryName,
        id: postParam.id.replace(/\.md$/, ''),
      },
    }
  })
}

// Get data for a single post
export async function getPostData(category, id) {
  const fullPath = path.join(postsDirectory, `${category}`, `${id}.md`)
  const fileContents = fs.readFileSync(fullPath, 'utf8')

  const { data, content } = matter(fileContents)

  return {
    id,
    content,
    category,
    mainImageUrl: data.mainImageUrl
      ? data.mainImageUrl
      : PREVIEW_IMAGES.BLOG_FALLBACK_IMAGE,
    ...data,
  }
}

// Get all post data, in chronological order
export function getSortedPostsData() {
  const gearFileNames = fs.readdirSync(gearDirectory)
  const thoughtsFileNames = fs.readdirSync(thoughtsDirectory)
  const tripReportsFileNames = fs.readdirSync(hikeDirectory)

  const gearFilesData = gearFileNames.map((fileName) => {
    const id = fileName.replace(/\.md$/, '')
    const fullPath = path.join(gearDirectory, fileName)
    const fileContents = fs.readFileSync(fullPath, 'utf8')

    const { data, content } = matter(fileContents)
    const longPreview = content.substring(0, 350)
    const category = CATEGORY_TYPE.GEAR

    return {
      id,
      category,
      preview: `${longPreview}...`,
      ...data,
    }
  })

  const thoughtsFilesData = thoughtsFileNames.map((fileName) => {
    const id = fileName.replace(/\.md$/, '')
    const fullPath = path.join(thoughtsDirectory, fileName)
    const fileContents = fs.readFileSync(fullPath, 'utf8')

    const { data, content } = matter(fileContents)
    const longPreview = content.substring(0, 350)
    const category = CATEGORY_TYPE.THOUGHTS

    return {
      id,
      category,
      preview: `${longPreview}...`,
      ...data,
    }
  })

  const tripReportsFilesData = tripReportsFileNames.map((fileName) => {
    const id = fileName.replace(/\.md$/, '')
    const fullPath = path.join(hikeDirectory, fileName)
    const fileContents = fs.readFileSync(fullPath, 'utf8')

    const { data, content } = matter(fileContents)
    const longPreview = content.substring(0, 350)
    const category = CATEGORY_TYPE.HIKE

    return {
      id,
      category,
      preview: `${longPreview}...`,
      ...data,
    }
  })

  const allPostsData = gearFilesData
    .concat(thoughtsFilesData)
    .concat(tripReportsFilesData)

  return allPostsData.sort((a, b) => {
    if (a.date < b.date) {
      return 1
    } else {
      return -1
    }
  })
}

// Create an array of five most recent objects to present
// on the landing page (2 blog posts + 3 climbs)
export async function getMostRecentPosts() {
  const recentBlogs = getSortedPostsData().splice(0, 3)
  const featuredBlogs = recentBlogs.map((post) => {
    return {
      id: post.id,
      date: post.date,
      title: post.title,
      href: `/${post.category}/${post.id}`,
      description: `${post.preview.substring(0, 150)}...`,
    }
  })

  const recentClimbs = await fetchMostRecentClimbs()
  const formClimbDescription = (climb) =>
    `A ${climb.distance} mile and ${addCommas(climb.gain)}' hike
      in the ${buildAreaName(climb.area)} of ${capitalizeEachWord(climb.state)}.`
  const featuredClimbs = recentClimbs.map((climb) => {
    return {
      id: climb.id,
      date: climb.date,
      title: climb.title,
      href: climb.slug ? `/hike/${climb.slug}` : `/climb-log?${climb.id}`,
      description: formClimbDescription(climb),
    }
  })

  const featuredPosts = [...featuredBlogs, ...featuredClimbs]

  // Sort posts by date
  return featuredPosts.sort((a, b) => {
    if (a.date < b.date) {
      return 1
    } else {
      return -1
    }
  })
}
