import { format } from 'date-fns'

const addCommas = (num) => num && num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')

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

// TODO: Match hike_title to existing NextJs generated slugs
const findMatchingSlug = (str) => {
  return false
}

const formatDate = (date) => format(date, 'LLL d, yyyy')

const formatDateWithDayOfWeek = (date) => format(date, 'iiii, LLLL do, yyyy')

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
  capitalizeEachWord,
  feetToMeters,
  findMatchingSlug,
  formatDate,
  formatDateWithDayOfWeek,
  getLocationData,
  milesToKilometers,
}
