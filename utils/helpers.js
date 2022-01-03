import format from 'date-fns/format'
import getMonth from 'date-fns/getMonth'
import { ALL_MONTHS } from './constants'
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

/**
 * This will let us know if a month input by the user is the same month as a photo or post.
 * It uses date-fns's getMonth to get the month of the photo/post as a number and stores it in the dateNum variable.
 * Then it takes the user's query month and compares it to the ALL_MONTHS constant (all of the months in order),
 * and builds an array of month numbers to compare the dateNum against ( ex: [0, 3, 10] ).
 * @param {String} queryMonth the query month from the user that we are checking, ex: "December".
 * @param {String} date usually in the format '2021-10-09'
 * @returns {Boolean}
 */
const checkMonth = (queryMonth, date) => {
  const dateNum = getMonth(new Date(date))
  const foundMonths = ALL_MONTHS.filter((month) => month.includes(queryMonth)).map(
    (month) => ALL_MONTHS.indexOf(month)
  )
  return foundMonths.includes(dateNum)
}

// Imperial to Metric conversions
const milesToKilometers = (num) => roundDecimal(num * 1.609)
const feetToMeters = (num) => addCommas(roundDecimal(num / 3.281))
const roundDecimal = (num) => num && num.toFixed(1)

export {
  addCommas,
  capitalizeEachWord,
  checkMonth,
  feetToMeters,
  formatDate,
  getLocationData,
  milesToKilometers,
}
