import { fmt, getDatabaseQueryConfig, notion } from '../notion'

const getGearConfig = (nextCursor = null) =>
  getDatabaseQueryConfig(nextCursor, null, process.env.NOTION_GEAR_DATABASE_ID, 'title')

const gearSorts = [{ property: 'title', direction: 'ascending' }]

const gearFilters = {
  and: [{ property: 'acquired_on', date: { is_not_empty: true } }],
}

const formatGear = (gearList) =>
  gearList.map((gear) => {
    const {
      id,
      properties: {
        acquired_on,
        brand,
        category,
        color,
        cost,
        img_slug,
        more_info,
        product,
        retired_on,
        title,
        url,
        weight_g,
        weight_oz,
      },
    } = gear
    return {
      id,
      title: fmt(title),
      acquired_on: fmt(acquired_on),
      brand: fmt(brand),
      category: fmt(category),
      color: fmt(color),
      cost: fmt(cost),
      img: `${fmt(img_slug)}.png`,
      more_info: fmt(more_info),
      product_str: fmt(product),
      retired_on: fmt(retired_on),
      url: fmt(url),
      weight_g: fmt(weight_g),
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
