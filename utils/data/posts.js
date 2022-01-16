import fs from 'fs'
import matter from 'gray-matter'
import path from 'path'
import { buildAreaName } from '../builders'
import { CATEGORY_TYPE, PREVIEW_IMAGES } from '../constants'
import { addCommas, capitalizeEachWord } from '../helpers'
import { fetchMostRecentClimbs } from './climbs'

const ALL_DIRECTORIES = {
  gearDir: path.join(process.cwd(), `blog/${CATEGORY_TYPE.GEAR}`),
  hikeDir: path.join(process.cwd(), `blog/${CATEGORY_TYPE.HIKE}`),
  thoughtsDir: path.join(process.cwd(), `blog/${CATEGORY_TYPE.THOUGHTS}`),
  allPosts: path.join(process.cwd(), 'blog'),
}

// Get all post IDs
export function getAllPostIds() {
  const gearFileNames = fs.readdirSync(ALL_DIRECTORIES.gearDir)
  const thoughtsFileNames = fs.readdirSync(ALL_DIRECTORIES.thoughtsDir)
  const tripReportsFileNames = fs.readdirSync(ALL_DIRECTORIES.hikeDir)

  let categoryNames = []

  gearFileNames.forEach(function () {
    categoryNames.push(CATEGORY_TYPE.GEAR)
  })
  thoughtsFileNames.forEach(function () {
    categoryNames.push(CATEGORY_TYPE.THOUGHTS)
  })
  tripReportsFileNames.forEach(function () {
    categoryNames.push(CATEGORY_TYPE.HIKE)
  })

  // Add every article name (id) to an arr
  const fileNames = gearFileNames.concat(thoughtsFileNames).concat(tripReportsFileNames)

  // Combine categoryNames & fileNames arrs
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
  const fullPath = path.join(ALL_DIRECTORIES.allPosts, `${category}`, `${id}.md`)
  const fileContents = fs.readFileSync(fullPath, 'utf8')

  const { data, content } = matter(fileContents)

  return {
    id,
    content,
    category,
    previewImgUrl: data.previewImgUrl
      ? data.previewImgUrl
      : PREVIEW_IMAGES.BLOG_FALLBACK_IMAGE,
    ...data,
  }
}

// Get all post data, in chronological order
export function getSortedPostsData() {
  const gearFileNames = fs.readdirSync(ALL_DIRECTORIES.gearDir)
  const thoughtsFileNames = fs.readdirSync(ALL_DIRECTORIES.thoughtsDir)
  const tripReportsFileNames = fs.readdirSync(ALL_DIRECTORIES.hikeDir)

  const gearFilesData = gearFileNames.map((fileName) => {
    const id = fileName.replace(/\.md$/, '')
    const fullPath = path.join(ALL_DIRECTORIES.gearDir, fileName)
    const fileContents = fs.readFileSync(fullPath, 'utf8')

    const { data, content } = matter(fileContents)
    const longPreview = content.substring(0, 215)
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
    const fullPath = path.join(ALL_DIRECTORIES.thoughtsDir, fileName)
    const fileContents = fs.readFileSync(fullPath, 'utf8')

    const { data, content } = matter(fileContents)
    const longPreview = content.substring(0, 215)
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
    const fullPath = path.join(ALL_DIRECTORIES.hikeDir, fileName)
    const fileContents = fs.readFileSync(fullPath, 'utf8')

    const { data, content } = matter(fileContents)
    const longPreview = content.substring(0, 215)
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
export async function getRecentPosts() {
  const recentBlogs = getSortedPostsData().splice(0, 3)
  const featuredBlogs = recentBlogs.map((post) => {
    return {
      id: post.id,
      date: post.date,
      title: post.title,
      href: `/${post.category}/${post.id}`,
      description: `${post.preview.substring(0, 150)}...`,
      previewImgUrl: post.previewImgUrl ? post.previewImgUrl : null,
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
      previewImgUrl: climb.previewImgUrl ? climb.previewImgUrl : null,
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
