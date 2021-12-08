import { Client, LogLevel } from '@notionhq/client'
import { getLocationData } from './helpers'

/**
 * Initialize Notion client & configure a default db query
 */
const notion = new Client({
  auth: process.env.NOTION_ACCESS_TOKEN,
  logLevel: LogLevel.DEBUG,
})
const getDatabaseQueryConfig = () => {
  let today = new Date().toISOString()

  const config = {
    database_id: process.env.NOTION_DATABASE_ID,
    filter: {
      and: [{ property: 'date', date: { on_or_before: today } }],
    },
  }

  return config
}

/**
 * Massage data returned from the Notion API
 * into a Table-friendly object
 */
const fmt = (field) => {
  
  switch (field.type) {
    case 'date':
      return field?.date?.start
    case 'number':
      return field?.number
    case 'rich_text':
      return field?.rich_text[0]?.plain_text
    case 'title':
      return field?.title[0]?.plain_text
    case 'url':
      return field?.url
  }
}

let page_ids = []
/**
 * Fetch list of climbs from Notion db
 */
export const fetchAllClimbs = async () => {
  page_ids = []
  const config = getDatabaseQueryConfig()
  config.sorts = [{ property: 'date', direction: 'descending' }]
  let response = await notion.databases.query(config)
  let returnArr = response.results.map((result) => {
    const {
      id,
      properties: { area, date, distance, gain, hike_title },
    } = result
    page_ids.push(id)
    // let page = await notion.pages.retrieve({ page_id: id });
    // console.log("PAGE:", page)
    return {
      id,
      date: fmt(date),
      title: fmt(hike_title),
      // slug: url,
      distance: fmt(distance),
      gain: fmt(gain),
      area: getLocationData(fmt(area)).area,
      state: getLocationData(fmt(area)).state,
      imgUrl: result.cover?.file?.url
    }
  }, [])
  return returnArr
  let returnObj = Promise.all(returnArr).then((data) => {
    console.log("DATA:", data)
    return data
  }).catch((err) => {
    console.warn("ERROR:", err)
    return []
  })
  console.log("???", returnObj)
  return returnObj
  // return returnArr.then((data) => {
  //   console.log("DATA:", data)
  //   return data
  // }).catch((err) => {
  //   console.warn("ERROR:", err)
  //   return []
  // })
}

/**
 * Filter by a 'Select' option
 */
export const fetchClimbsByFilter = async () => {}

/**
 * Filter by an input str (Search functionality)
 */
export const fetchClimbsBySearchQuery = async (/* str */) => {}

/**
 * Fetch a single climb's data
 */
export const fetchClimbData = async (/* id */) => {}

export const fetchClimbHeaderImages = async () => {
  //30beee35-660c-409b-bd08-ccb68df5db45
  // let response = await notion.pages.retrieve({ page_id: '30beee35-660c-409b-bd08-ccb68df5db45' });
  // let response = await notion.databases.retrieve({database_id: process.env.NOTION_DATABASE_ID})
}
