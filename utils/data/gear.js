import { fmt, getDatabaseQueryConfig, notion } from '../notion'

const gearConfig = getDatabaseQueryConfig(
  null,
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
        // Current as of 01/07/2022
        img,
        url,
        weight_lb,
        category,
        more_info,
        acquired_on,
        product_name,
        weight_oz,
        cost,
        weight_g,
        Name,
      },
    } = gear
    return {
      id,
      img: fmt(img),
      url: fmt(url),
      weight_lb: fmt(weight_lb),
      category: fmt(category),
      more_info: null, //fmt(more_info),
      acquired_on: fmt(acquired_on),
      product_name: null, //fmt(product_name),
      weight_oz: fmt(weight_oz),
      cost: fmt(cost),
      weight_g: fmt(weight_g),
      Name: fmt(Name),
    }
  })

const fetchAllGear = async () => {
  gearConfig.sorts = gearSorts
  gearConfig.filter = gearFilters
  let response = await notion.databases.query(gearConfig)
  let responseArray = [...response.results]
  while (response.has_more) {
    // response.has_more tells us if the database has more pages
    // response.next_cursor contains the next page of results,
    //    can be passed as the start_cursor param to the same endpoint
    const config = getDatabaseQueryConfig(
      response.next_cursor,
      null,
      process.env.NOTION_GEAR_DATABASE_ID,
      'acquired_on'
    )
    config.sorts = gearSorts
    config.filter = gearFilters
    response = await notion.databases.query(config)
    responseArray = [...responseArray, ...response.results]
  }
  responseArray = formatGear(responseArray)
  return responseArray
}

export { fetchAllGear }
