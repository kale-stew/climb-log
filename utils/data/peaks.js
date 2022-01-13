import { fmt, getDatabaseQueryConfig, notion } from '../notion'

const getPeakConfig = (nextCursor = null) =>
  getDatabaseQueryConfig(nextCursor, null, process.env.NOTION_PEAK_DATABASE_ID)
const peakSorts = [{ property: 'elevation', direction: 'descending' }]

const formatPeaks = (peakList) =>
  peakList.map((peak) => {
    const { id, properties } = peak
    return {
      id,
      title: fmt(properties.peak_name),
      elevation: fmt(properties.elevation),
      first_completed: fmt(properties.first_completed_on),
      range: properties.range.select,
      img: properties.img_url ? fmt(properties.img_url) : null,
    }
  })

const fetchAllPeaks = async () => {
  const peakConfig = getPeakConfig()
  peakConfig.sorts = peakSorts
  let response = await notion.databases.query(peakConfig)
  let responseArray = [...response.results]
  while (response.has_more) {
    // continue to query if next_cursor is returned
    const config = getPeakConfig(response.next_cursor)
    config.sorts = peakSorts
    response = await notion.databases.query(config)
    responseArray = [...responseArray, ...response.results]
  }
  responseArray = formatPeaks(responseArray)
  return responseArray
}

export { fetchAllPeaks }
