import { fmt, getDatabaseQueryConfig, notion } from '../notion'

const getPeakConfig = (nextCursor = null) =>
  getDatabaseQueryConfig(nextCursor, null, process.env.NOTION_PEAK_DATABASE_ID)
const peakSorts = [{ property: 'elevation', direction: 'descending' }]

const getDateFirstCompleted = (completed_on) => {
  // Notion API is broken and doesn't return valid values for formula or rollup types
  // so we will have to reference the climbs and see if this peak exists in there
  // and then add it to this arr? Or I'll have to add a custom property.
  // Either way, the API is failing us dramatically here. Ugh.
  return completed_on
}

const formatPeaks = (peakList) =>
  peakList.map((peak) => {
    const {
      id,
      properties: { elevation, completed_on, range, peak_name, times_completed },
    } = peak
    console.log(
      'No. of Times Completed:',
      times_completed.rollup,
      'Completed on:',
      completed_on.formula
    )
    return {
      id,
      title: fmt(peak_name),
      elevation: fmt(elevation),
      first_completed: getDateFirstCompleted(completed_on),
      number_of_summits: times_completed,
      range: fmt(range),
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
