import format from 'date-fns/format'
import getMonth from 'date-fns/getMonth'
import getYear from 'date-fns/getYear'
import { ALL_MONTHS } from './constants'

export const addCommas = (num) =>
  num && num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')

export const capitalizeEachWord = (string) => {
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

export const filterByYear = (arr, year) =>
  arr.filter(({ date }) => date.indexOf(year) >= 0)

export const formatDate = (date, type) => {
  if (typeof date !== Date) {
    date = new Date(date)
  }

  if (type === 'long') {
    return format(date, 'PPPP')
  } else if (type === 'short') {
    return format(date, 'M/d/yy')
  }

  return format(date, 'PP')
}

export const getLocationData = (str) => {
  const [area, state] = str.toLowerCase().split(',')
  return {
    area,
    state,
  }
}

export const makeKebabCase = (str) =>
  str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase()

/**
 * Checks if user-input month is the same month as a photo or post.
 * It uses date-fns's `getMonth` to grab the month of the photo/post as a number & then
 * stores it in the `dateNum` variable. Then, take user's query str and compare it to
 * ALL_MONTHS const (all of the months in order). Builds an array of month numbers to
 * compare the `dateNum` against ( ex: [0, 3, 10] ).
 * @param {String} queryMonth user-input string, ex: "December".
 * @param {String} date formatted, ex: '2021-10-09'
 * @returns {Boolean}
 */
export const checkMonth = (queryMonth, date) => {
  const dateNum = getMonth(new Date(date))
  const foundMonths = ALL_MONTHS.filter((month) => month.includes(queryMonth)).map(
    (month) => ALL_MONTHS.indexOf(month)
  )
  return foundMonths.includes(dateNum)
}

/**
 * Checks to see if a query number is the same year as a photo/post
 * @param {Number} queryDate user-input str, ex: "2020"
 * @param {String} dateToCheck
 * @returns {Boolean}
 */
export const checkYear = (queryDate, dateToCheck) => {
  let dateSplit = dateToCheck !== null && dateToCheck.split('-')
  if (!isNaN(dateSplit[0])) {
    let queryYear = getYear(new Date(queryDate, 1, 1))
    let checkYear = getYear(new Date(Number(dateSplit[0]), 1, 1))
    return queryYear == checkYear
  }
  return false
}

// Imperial to Metric conversions
export const milesToKilometers = (num) => roundDecimal(num * 1.609)
export const feetToMeters = (num) => roundDecimal(num / 3.281)
export const roundDecimal = (num) => num && Number(num.toFixed(1))
