import fs from 'fs'
import html from 'remark-html'
import matter from 'gray-matter'
import path from 'path'
import { remark } from 'remark'
import {
  gearCategory,
  gearDirectory,
  hikeCategory,
  hikeDirectory,
  thoughtsCategory,
  thoughtsDirectory,
} from './constants'

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
    categoryNames.push(gearCategory)
  })
  thoughtsFileNames.forEach(function (thoughtsFileName) {
    categoryNames.push(thoughtsCategory)
  })
  tripReportsFileNames.forEach(function (tripReportsFileName) {
    categoryNames.push(hikeCategory)
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

export function getSortedPostsData() {
  // Get file names under each category directory
  const gearFileNames = fs.readdirSync(gearDirectory)
  const thoughtsFileNames = fs.readdirSync(thoughtsDirectory)
  const tripReportsFileNames = fs.readdirSync(hikeDirectory)

  // get data from Gear posts
  const gearFilesData = gearFileNames.map((fileName) => {
    // Remove ".md" from file name to get id
    const id = fileName.replace(/\.md$/, '')

    // Read markdown file as string
    const fullPath = path.join(gearDirectory, fileName)
    const fileContents = fs.readFileSync(fullPath, 'utf8')

    // Use gray-matter to parse the post metadata section
    const matterResult = matter(fileContents)

    // Set the category
    const category = gearCategory

    // Combine the data with the id
    return {
      id,
      category,
      ...matterResult.data,
    }
  })

  // get data from Thoughts posts
  const thoughtsFilesData = thoughtsFileNames.map((fileName) => {
    // Remove ".md" from file name to get id
    const id = fileName.replace(/\.md$/, '')

    // Read markdown file as string
    const fullPath = path.join(thoughtsDirectory, fileName)
    const fileContents = fs.readFileSync(fullPath, 'utf8')

    // Use gray-matter to parse the post metadata section
    const matterResult = matter(fileContents)

    // Set the category
    const category = thoughtsCategory

    // Combine the data with the id
    return {
      id,
      category,
      ...matterResult.data,
    }
  })

  // get data from Trip Report posts
  const tripReportsFilesData = tripReportsFileNames.map((fileName) => {
    // Remove ".md" from file name to get id
    const id = fileName.replace(/\.md$/, '')

    // Read markdown file as string
    const fullPath = path.join(hikeDirectory, fileName)
    const fileContents = fs.readFileSync(fullPath, 'utf8')

    // Use gray-matter to parse the post metadata section
    const matterResult = matter(fileContents)

    // Set the category
    const category = hikeCategory

    // Combine the data with the id
    return {
      id,
      category,
      ...matterResult.data,
    }
  })

  // Concatenate each articles data in one array
  const allPostsData = gearFilesData
    .concat(thoughtsFilesData)
    .concat(tripReportsFilesData)

  // Sort articles by date
  return allPostsData.sort((a, b) => {
    if (a.date < b.date) {
      return 1
    } else {
      return -1
    }
  })
}

// Get relevant post data
export async function getPostData(category, id) {
  // Set the relevant /posts file path using category and id in the query params
  const fullPath = path.join(postsDirectory, `${category}`, `${id}.md`)
  const fileContents = fs.readFileSync(fullPath, 'utf8')

  // Use gray-matter to parse the post metadata section
  const matterResult = matter(fileContents)
  console.log(matterResult)

  // Use remark to convert markdown into HTML string
  const processedContent = await remark().use(html).process(matterResult.content)
  const contentHtml = processedContent.toString()

  // Combine the data with the id
  return {
    id,
    contentHtml,
    ...matterResult.data,
  }
}
