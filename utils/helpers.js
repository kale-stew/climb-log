// Massage data from Notion
const formatDate = (date) => {
  const arr = date.split('-')
  // toDateString returns as 'DayOfWeek MON DAY YEAR'
  return new Date(arr[0], arr[1], arr[2]).toDateString()
}

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
  formatStatsImperial,
  formatStatsMetric,
  getLocationData,
  milesToKilometers,
}
