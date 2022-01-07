import { fmt, getDatabaseQueryConfig, notion } from '../notion'

const gearConfig = getDatabaseQueryConfig(
    null,
    null,
    process.env.NOTION_GEAR_DATABASE_ID,
    'acquired_on',
  )
      
  const formatGear = (gearList) => {
    return gearList.map((gear) => {
        const {
          id,
          properties: {
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
        const finalObj = {
            id,
            img: fmt(img),
            url: fmt(url),
            weight_lb: fmt(weight_lb),
            category: fmt(category),
            more_info: null,//fmt(more_info),
            acquired_on: null,//fmt(acquired_on),
            product_name: null,//fmt(product_name),
            weight_oz: fmt(weight_oz),
            cost: fmt(cost),
            weight_g: fmt(weight_g),
            Name: fmt(Name),
        }
        return finalObj
    })
  }

  const fetchAllGear = async () => {
    gearConfig.sorts = [{ property: 'acquired_on', direction: 'descending' }]
    gearConfig.filter = { "property": "category", "multi_select": {"does_not_contain": "Retired"}}
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
          'acquired_on',
        )
        config.sorts = [{ property: 'acquired_on', direction: 'descending' }]
        response = await notion.databases.query(config)
        responseArray = [...responseArray, ...response.results]
      }
      responseArray = formatGear(responseArray)
      return responseArray
  }

export { fetchAllGear }