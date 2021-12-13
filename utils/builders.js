import { capitalizeEachWord } from './helpers'
import { PARK_TYPES } from './constants'

/**
 * Format the area rich_text that is returned from the Notion API.
 * Returns one properly formatted string (i.e. 'Rocky Mountain National Park')
 */
const buildAreaName = (area) => {
  const areaStrings = area.split(' ')
  const arr = areaStrings.map((str) => {
    return PARK_TYPES[str] ? PARK_TYPES[str] : str
  })

  const reformattedArea = arr.toString().replace(/,/g, ' ')
  return capitalizeEachWord(`${reformattedArea.trim()}`)
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
 * Create a new Select option for each value in the PARK_TYPES
 * constant. Returns an array of Selects, sorted A→Z
 */
const createParkSelects = () =>
  Object.values(PARK_TYPES).map((parkType) => {
    return {
      text: capitalizeEachWord(`all ${parkType}s`),
      value: parkType,
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
 * PARK_TYPES. If it does, return the key value of the PARK_TYPE,
 * otherwise return undefined.
 */
const containsParkType = (area) => {
  const strings = area.split(' ')
  return strings.find((str) => {
    return PARK_TYPES[str]
  })
}

export {
  buildAreaName,
  createAreaSelects,
  createParkSelects,
  createStateSelects,
  containsParkType,
}
