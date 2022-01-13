import { fmt, getDatabaseQueryConfig, notion } from '../notion'

const getGearConfig = (nextCursor = null) =>
  getDatabaseQueryConfig(nextCursor, null, process.env.NOTION_GEAR_DATABASE_ID, 'title')

const gearSorts = [{ property: 'title', direction: 'ascending' }]
const gearFilters = {
  and: [{ property: 'acquired_on', date: { is_not_empty: true } }],
}

const formatGear = (gearList) =>
  gearList.map((gear) => {
    const { id, properties } = gear
    return {
      id,
      title: fmt(properties.title),
      acquired_on: fmt(properties.acquired_on),
      brand: fmt(properties.brand),
      category: fmt(properties.category),
      color: fmt(properties.color),
      // cost: fmt(properties.cost),
      img: `${fmt(properties.img_slug)}.png`,
      more_info: fmt(properties.more_info),
      product_str: fmt(properties.product),
      retired_on: fmt(properties.retired_on),
      // url: fmt(properties.url),
      // weight_g: fmt(properties.weight_g),
      // weight_oz: fmt(properties.weight_oz),
    }
  })

const fetchAllGear = async () => {
  const gearConfig = getGearConfig()
  gearConfig.sorts = gearSorts
  gearConfig.filter = gearFilters
  let response = await notion.databases.query(gearConfig)
  let responseArray = [...response.results]
  while (response.has_more) {
    // continue to query if next_cursor is returned
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
