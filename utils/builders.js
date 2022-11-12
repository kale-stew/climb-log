import { capitalizeEachWord } from './helpers'
import { AREA_TYPE } from './constants'

/**
 * Format the area rich_text that is returned from the Notion API.
 * Returns one properly formatted string (i.e. 'Rocky Mountain National Park')
 */
const buildAreaName = (area) => {
  const areaStrings = area.split(' ')
  const arr = areaStrings.map((str) =>
    AREA_TYPE[str.toUpperCase()] ? AREA_TYPE[str.toUpperCase()] : str
  )
  const reformattedArea = arr.toString().replace(/,/g, ' ')
  return capitalizeEachWord(reformattedArea.trim())
}

/**
 * Create a new Select option for each unique climb area that
 * exists in the allClimbs arr, passed in. Returns an array of
 * Selects, sorted A→Z
 */
const createAreaSelects = (allClimbs) =>
  [...new Set(allClimbs.map((climb) => climb.area))]
    .sort((a, b) => {
      if (a < b) return -1
      if (a > b) return 1
      return 0
    })
    .map((area) => {
      // We have 3 different types of category in the same list, so we include
      // a "type" that we can later use to ensure we are filtering by that type
      return {
        text: buildAreaName(area),
        value: area.trim(),
        type: 'area',
      }
    })

/**
 * Create a new Select option for each value in the AREA_TYPE
 * constant. Returns an array of Selects, sorted A→Z
 */
const createAreaTypeSelects = () =>
  Object.values(AREA_TYPE).map((areaType) => {
    return {
      text: capitalizeEachWord(`all ${areaType}s`),
      value: areaType,
      type: 'area',
    }
  })

/**
 * Create a new Select option for each unique state that
 * exists in the allClimbs arr, passed in. Returns an array of
 * Selects, sorted A→Z
 */
const createStateSelects = (allClimbs) =>
  [...new Set(allClimbs.map((climb) => climb.state))]
    .sort((a, b) => {
      if (a < b) return -1
      if (a > b) return 1
      return 0
    })
    .map((state) => {
      return {
        text: capitalizeEachWord(`all ${state.trim()}`),
        value: state.trim(),
        type: 'state',
      }
    })

/**
 * Checks if a climb's area name corresponds to one of our
 * AREA_TYPE. If it does, return the key value of the AREA_TYPE,
 * otherwise return undefined.
 */
const containsAreaType = (area) => {
  const strings = area.split(' ')
  return strings.find((str) => {
    return AREA_TYPE[str]
  })
}

export {
  buildAreaName,
  createAreaSelects,
  createAreaTypeSelects,
  createStateSelects,
  containsAreaType,
}
