import { format } from 'date-fns'

const addCommas = (num) => num && num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')

const roundDecimal = (num) => num && num.toFixed(2)

const getLocationData = (str) => {
  const [area, state] = str.toLowerCase().split(',')
  return {
    area,
    state,
  }
}

// TODO: Match hike_title to existing NextJs generated slugs
const findMatchingSlug = (str) => {
  return false
}

const formatDate = (date) => format(date, 'LLLL d, yyyy')

const formatDateWithDayOfWeek = (date) => format(date, 'iiii, LLLL do, yyyy')

// Metric to Imperial conversion
const formatStatsImperial = (distance, gain) =>
  (distance && gain && `${distance} miles & ${addCommas(gain)}'`) || null

// Imperial to Metric conversions
const milesToKilometers = (num) => roundDecimal(num * 1.609)

const feetToMeters = (num) => addCommas(roundDecimal(num / 3.281))

const formatStatsMetric = (distance, gain) =>
  (distance && gain && `${milesToKilometers(distance)} km & ${feetToMeters(gain)} m`) ||
  null

export {
  addCommas,
  feetToMeters,
  findMatchingSlug,
  formatDate,
  formatDateWithDayOfWeek,
  formatStatsImperial,
  formatStatsMetric,
  getLocationData,
  milesToKilometers,
}
