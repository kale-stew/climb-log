export const formatDate = (date) => {
  const arr = date.split('-')
  // toDateString returns as 'DayOfWeek MON DAY YEAR'
  return new Date(arr[0], arr[1], arr[2]).toDateString()
}

const addCommas = (num) => num && num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
const roundDecimal = (num) => num && num.toFixed(2)

export const formatStatsImperial = (distance, gain) =>
  (distance && gain && `${distance} miles & ${addCommas(gain)}'`) || null

// Imperial to Metric conversions
const milesToKilometers = (num) => roundDecimal(num * 1.609)
export const feetToMeters = (num) => addCommas(roundDecimal(num / 3.281))

export const formatStatsMetric = (distance, gain) =>
  (distance && gain && `${milesToKilometers(distance)} km & ${feetToMeters(gain)} m`) ||
  null
