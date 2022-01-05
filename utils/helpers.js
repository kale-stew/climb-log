import { isAfter } from 'date-fns'
import format from 'date-fns/format'
import getMonth from 'date-fns/getMonth'
import getYear from 'date-fns/getYear'
import isBefore from 'date-fns/isBefore'
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
 * Checks if user-input month is the same month as a photo or post.
 * It uses date-fns's `getMonth` to grab the month of the photo/post as a number & then
 * stores it in the `dateNum` variable. Then, take user's query str and compare it to
 * ALL_MONTHS const (all of the months in order). Builds an array of month numbers to
 * compare the `dateNum` against ( ex: [0, 3, 10] ).
 * @param {String} queryMonth user-input string, ex: "December".
 * @param {String} date formatted, ex: '2021-10-09'
 * @returns {Boolean}
 */
const checkMonth = (queryMonth, date) => {
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
const checkYear = (queryDate, dateToCheck) => {
  let dateSplit = dateToCheck.split('-')
  if (!isNaN(dateSplit[0])) {
    let queryYear = getYear(new Date(queryDate, 1, 1))
    let checkYear = getYear(new Date(Number(dateSplit[0]), 1, 1))
    return queryYear == checkYear
  }
  return false
}

const isSouthernHem = () => {
  let y = new Date()
    if (y.getTimezoneOffset==undefined) return null
    y = y.getFullYear()
    let jan = -(new Date(y, 0, 1, 0, 0, 0, 0).getTimezoneOffset())
    let jul = -(new Date(y, 6, 1, 0, 0, 0, 0).getTimezoneOffset())
    let diff = jan - jul
    if (diff <  0) return false
    if (diff >  0) return true
    return null
}

const getSeason = (dateToCheck) => {
  const isSouthernHemisphere = isSouthernHem()
  let dateSplit = dateToCheck.split('-')
  let formattedDate = new Date(dateSplit[0], (Number(dateSplit[1]) - 1), (Number(dateSplit[2])))
  let springStart = new Date(dateSplit[0], 3, 20)
  let summerStart = new Date(dateSplit[0], 6, 21)
  let fallStart = new Date(dateSplit[0], 9, 22)
  let fallEnd = new Date(dateSplit[0], 12, 21)
  let winterStart = new Date(dateSplit[0] - 1, 12, 21)
  if(isBefore(formattedDate, springStart) && isAfter(formattedDate, winterStart)) {
    return isSouthernHemisphere ? 'SUMMER' : 'WINTER' // Winter
  }
  if (isBefore(formattedDate, summerStart) && isAfter(formattedDate, springStart)) {
    return isSouthernHemisphere ? 'FALLAUTUMN' : 'SPRING' // Spring
  }
  if (isBefore(formattedDate, fallStart) && isAfter(formattedDate, summerStart)) {
    return isSouthernHemisphere ? 'WINTER' : 'SUMMER' // Summer
  }
  if (isBefore(formattedDate, fallEnd) && isAfter(formattedDate, fallStart)) {
    return isSouthernHemisphere ? 'SPRING' : 'FALLAUTUMN' // Fall
  }
  return 'not a season?'
}

// Imperial to Metric conversions
const milesToKilometers = (num) => roundDecimal(num * 1.609)
const feetToMeters = (num) => roundDecimal(num / 3.281)
const roundDecimal = (num) => num && Number(num.toFixed(1))

export {
  addCommas,
  capitalizeEachWord,
  checkMonth,
  checkYear,
  feetToMeters,
  formatDate,
  getSeason,
  getLocationData,
  milesToKilometers,
  roundDecimal
}
