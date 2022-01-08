import { fmt, getDatabaseQueryConfig, notion } from '../notion'

const getGearConfig = (nextCursor = null) =>
  getDatabaseQueryConfig(
    nextCursor,
    null,
    process.env.NOTION_GEAR_DATABASE_ID,
    'acquired_on'
  )

const gearSorts = [{ property: 'acquired_on', direction: 'descending' }]

const gearFilters = {
  and: [
    { property: 'category', multi_select: { does_not_contain: 'Retired' } },
    { property: 'acquired_on', date: { is_not_empty: true } },
  ],
}

const formatGear = (gearList) =>
  gearList.map((gear) => {
    const {
      id,
      properties: {
        acquired_on,
        category,
        cost,
        img,
        // more_info,
        // product_name,
        title,
        url,
        weight_g,
        weight_lb,
        weight_oz,
      },
    } = gear
    return {
      id,
      title: fmt(title),
      acquired_on: fmt(acquired_on),
      category: fmt(category),
      img: fmt(img),
      url: fmt(url),
      more_info: null, // fmt(more_info),
      product_name: null, // fmt(product_name),
      cost: fmt(cost),
      weight_g: fmt(weight_g),
      weight_lb: fmt(weight_lb),
      weight_oz: fmt(weight_oz),
    }
  })

const fetchAllGear = async () => {
  const gearConfig = getGearConfig()
  gearConfig.sorts = gearSorts
  gearConfig.filter = gearFilters
  let response = await notion.databases.query(gearConfig)
  let responseArray = [...response.results]
  while (response.has_more) {
    // response.has_more tells us if the database has more pages
    // response.next_cursor contains the next page of results,
    //    can be passed as the start_cursor param to the same endpoint
    const config = getGearConfig(response.next_cursor)
    config.sorts = gearSorts
    config.filter = gearFilters
    response = await notion.databases.query(config)
    responseArray = [...responseArray, ...response.results]
  }
  responseArray = formatGear(responseArray)
  return responseArray
}

export { fetchAllGear }