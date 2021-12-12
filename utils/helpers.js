import { format } from 'date-fns'
import { PARK_TYPES } from './constants'

const addCommas = (num) => num && num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')

const buildAreaName = (area) => {
  const areaStrings = area.split(' ')
  const arr = areaStrings.map((str) => {
    return PARK_TYPES[str] ? PARK_TYPES[str] : str
  })

  const reformattedArea = arr.toString().replace(/,/g, ' ')
  return capitalizeEachWord(`${reformattedArea.trim()}`)
}

const capitalizeEachWord = (string) => {
  let capitalize = string
    .split(' ')
    .map((s) => {
      if (s == 'de' || s == 'la') {
        return s
      }
      return s.charAt(0).toUpperCase() + s.substring(1)
    })
    .join(' ')
  return capitalize
}

/**
 * We can use this function to tell if a climb's area name coorisponds to one of our PARK_TYPES.
 * If we find that it does, we'll return the key value of the PARK_TYPE, otherwise we'll return 
 * undefined.
 * @param {String} area 
 * @returns String || undefined
 */
const containsParkType = (area) => {
  const strings = area.split(' ')
  return strings.find((str) => {
    return PARK_TYPES[str]
  })
}

const formatDate = (date) => format(date, 'PP')

const formatDateWithDayOfWeek = (date) => format(date, 'PPPP')

const getLocationData = (str) => {
  const [area, state] = str.toLowerCase().split(',')
  return {
    area,
    state,
  }
}

// Imperial to Metric conversions
const milesToKilometers = (num) => roundDecimal(num * 1.609)
const feetToMeters = (num) => addCommas(roundDecimal(num / 3.281))

const roundDecimal = (num) => num && num.toFixed(2)

export {
  addCommas,
  buildAreaName,
  capitalizeEachWord,
  containsParkType,
  feetToMeters,
  formatDate,
  formatDateWithDayOfWeek,
  getLocationData,
  milesToKilometers,
}
