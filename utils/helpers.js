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

const formatDate = (date, type) => {
  if (type === 'long') {
    return format(date, 'PPPP')
  } else if (type === 'short') {
    return format(date, 'M/d/yy')
  }

  return format(date, 'PP')
}

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

const roundDecimal = (num) => num && num.toFixed(1)

export {
  addCommas,
  capitalizeEachWord,
  feetToMeters,
  formatDate,
  getLocationData,
  milesToKilometers,
}
