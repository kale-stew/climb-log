import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import CustomHead from '../components/CustomHead'
import Layout from '../components/Layout'
import Table from '../components/Table'
import {
  containsAreaType,
  createAreaSelects,
  createAreaTypeSelects,
  createStateSelects,
} from '../utils/builders'
import {
  CATEGORY_TYPE,
  METADATA,
  AREA_TYPE,
  TABLE_SORT_ORDER,
  ALL_MONTHS,
} from '../utils/constants'
import { event } from '../utils/gtag'
import { fetchAllClimbs } from '../utils/notion'
import getMonth from 'date-fns/getMonth'
import tableStyles from '../components/Table.module.css'

const ClimbLog = ({ allClimbs }) => {
  const [metric, setMetric] = useState(false)
  const [data, setData] = useState(allClimbs)
  const [sortOrder, setSortOrder] = useState({
    property: 'date',
    direction: TABLE_SORT_ORDER.DESC,
  })
  const [allAreas, setAllAreas] = useState([])
  const [areaFilter, setAreaFilter] = useState(CATEGORY_TYPE.ALL)
  const [filteredClimbs, setFilteredClimbs] = useState(allClimbs)
  const [blanketEnabled, setBlanketEnabled] = useState(false)
  const [rowClicked, setRowClicked] = useState(null)
  const [isPopoverOpen, setIsPopoverOpen] = useState(false)
  const [userSearch, setUserSearch] = useState('')

  const router = useRouter()
  const firstUpdate = useRef(true)
  const title = `${METADATA.SITE_NAME} | Climb Log`

  /**
   * refreshData utilizes Next.js's router to replace the path with the current one,
   * effectively going nowhere. This does allow the page to re-render, because
   * we're now sending JSON to the React side of things instead of the full HTML
   * like Next usually does.
   * Note: It does cause a new API call, so maybe change this in the future?
   */
  const refreshData = () => router.replace(router.asPath)

  /**
   * sortData allows us to sort the data by area selected with the areaFilter state,
   * or pass one in ourselves. This is helpful because it lets us persist sort orders
   * along with whatever area filter the user selects. Future sortOrder could also be
   * added, all we would need to do is pass in another parameter with its corresponding
   * state as a default value.
   *
   * @param {Array} dataToSort
   * @param {string} area
   */
  const sortData = (dataToSort = allClimbs, area = areaFilter) => {
    // Check to see what direction we're sorting by
    let sortBy = sortOrder.direction === TABLE_SORT_ORDER.ASC ? -1 : 1
    let sortedData = dataToSort.sort((a, b) => {
      if (sortOrder.property != 'date') {
        if (a[sortOrder.property] < b[sortOrder.property]) return -1 * sortBy
        if (a[sortOrder.property] > b[sortOrder.property]) return 1 * sortBy
        return 0
      } else {
        // Sort the date in ascending order
        let dateA = new Date(a[sortOrder.property])
        let dateB = new Date(b[sortOrder.property])
        return dateA - dateB
      }
    })

    // If we want desc order with date, reverse the sorted data as it will be in ascending order
    if (sortOrder.property === 'date' && sortOrder.direction === TABLE_SORT_ORDER.DESC) {
      sortedData.reverse()
    }
    buildCategories()
    setData(sortedData)
  }

  /**
   * Checks whether the sort order state has changed.
   * Allows us to properly sort data & update the table.
   */
  useEffect(() => {
    // We don't want this to cause the page to do too many re-renders,
    // so let's make sure we don't call the sorting function on the first
    // page load.
    if (firstUpdate.current) {
      firstUpdate.current = false
      return
    }
    sortData(filteredClimbs)
  }, [sortOrder])

  // Build the area categories on the first load (populating dropdown)
  useEffect(() => {
    buildCategories()
    const queryPayload = router.query
    if (Object.keys(queryPayload).length > 0) {
      togglePopOver(Object.keys(queryPayload)[0])
    }
  }, [])

  const buildCategories = () => {
    let areaCategories = createAreaSelects(allClimbs)
    let areaTypeCategories = createAreaTypeSelects()
    let stateCategories = createStateSelects(allClimbs)

    // Make sure area types show up above the rest of the categories
    areaCategories.unshift(...areaTypeCategories)
    // Add states to the top of the dropdown
    areaCategories.unshift(...stateCategories)
    setAllAreas(areaCategories)
  }

  /**
   * Scroll to the item being brought into view (for routing to items in
   * the climb-log directly)
   */
  const scrollTo = (position) => {
    const itemToScrollTo = document.getElementById(`tableRow${position}`)
    itemToScrollTo.scrollIntoView(false)
  }

  /**
   * When the user selects an area, set state accordingly.
   * We're dealing with a `state` and `area` type, so the value of
   * the dropdown item will be formatted as "colorado?state" or
   * "san juans?area", so we can filter the climbs obj with variables
   * depending on the filter type.
   *
   * @param {string} filter
   */
  const selectAreaFilter = (filter) => {
    event(
      'gtm.click',
      filter,
      `https://www.kylies.photos${router.asPath}`,
      'AreaSelect',
      `${METADATA.SITE_NAME} | Climb Log`
    )
    let filterType = filter.split('?')[1]
    let selectedFilter = filter.split('?')[0]
    // Set the areaFilter so that the drop down can handle its own state
    // (we want it to be the "colorado?state" formatted value)
    setAreaFilter(filter)
    // If the area filter the user selects is "all", let's reset to allClimbs
    // and make sure we sort based on the current order
    if (filter == CATEGORY_TYPE.ALL) {
      setFilteredClimbs(allClimbs)
      // Reset the filter using sortData()
      sortData(allClimbs, CATEGORY_TYPE.ALL)
      return
    }
    // Otherwise let's filter down to what we want based on the filter type
    let filteredData = allClimbs.filter((climb) => {
      // Let's see if the selected filter is an existing area type
      let climbAreaTypeStr = containsAreaType(climb[filterType])
      let areaTypes = Object.values(AREA_TYPE)
      if (climbAreaTypeStr && areaTypes.includes(selectedFilter)) {
        // We have found that the climb is one of the AREA_TYPE, that means the
        // selected filter is 'National Park', 'State Park', 'Wilderness', etc.

        // If the filter is a single word, Wilderness, don't split it
        if (selectedFilter == AREA_TYPE.wa) {
          return climb.area.slice(-2) == 'wa'
        }

        // For the rest of the filters, grab the first letters of the selected filter
        // and compare to this climb's area type (climbAreaTypeStr)
        let selectedFilterSplit = selectedFilter.split(' ')
        let selectedFirstLetters = selectedFilterSplit[0][0] + selectedFilterSplit[1][0]
        return climbAreaTypeStr.toUpperCase() == selectedFirstLetters.toUpperCase()
      }

      return climb[filterType].trim() == selectedFilter.trim()
    })
    setFilteredClimbs(filteredData)
    sortData(filteredData, selectedFilter)
  }

  const checkMonth = (queryMonth, date) => {
    const dateNum = getMonth(new Date(date))
    const foundMonths = ALL_MONTHS.filter((month) => month.includes(queryMonth)).map(
      (month) => ALL_MONTHS.indexOf(month)
    )

    return foundMonths.includes(dateNum)
  }

  const searchClimbLog = (e) => {
    if (e === '') {
      setFilteredClimbs(allClimbs)
      sortData(allClimbs, CATEGORY_TYPE.ALL)
      setUserSearch(e)
      return
    }

    let sorted = allClimbs.filter((climb) => {
      let { area, date, state, title } = climb
      let searchQuery = e.toUpperCase()
      area = area.toUpperCase()
      state = state.toUpperCase()
      title = title.toUpperCase()

      return (
        title.includes(searchQuery) ||
        state.includes(searchQuery) ||
        area.includes(searchQuery) ||
        checkMonth(searchQuery, date)
      )
    })

    setFilteredClimbs(sorted)
    sortData(sorted)
    setUserSearch(e)
  }

  const toggleBlanketEnabled = () => {
    if (blanketEnabled) {
      setBlanketEnabled(false)
    } else {
      setBlanketEnabled(true)
    }
  }

  const togglePopOver = (id) => {
    if (isPopoverOpen) {
      toggleBlanketEnabled()
      setIsPopoverOpen(false)
      setRowClicked(null)
    } else if (Number.isInteger(id)) {
      toggleBlanketEnabled()
      setIsPopoverOpen(true)
      setRowClicked(id)
    } else if (!Number.isInteger(id)) {
      let found = data.findIndex((climb) => climb.id == id)
      if (found != undefined) {
        toggleBlanketEnabled()
        setIsPopoverOpen(true)
        setRowClicked(found)
        scrollTo(found)
      }
    }
  }

  return (
    <Layout>
      {/* This 'blanket' div allows us to dim the background on popup using css 🙌🏻 */}
      <div className={blanketEnabled ? tableStyles.blanket : ''}></div>
      <CustomHead title={`${METADATA.SITE_NAME} | Climb Log`} />
      <Table
        allAreas={allAreas}
        areaFilter={areaFilter}
        data={data}
        isPopoverOpen={isPopoverOpen}
        metric={metric}
        rowClicked={rowClicked}
        setAreaFilter={selectAreaFilter}
        setMetric={setMetric}
        setSortOrder={setSortOrder}
        setUserSearch={searchClimbLog}
        sortOrder={sortOrder}
        togglePopOver={togglePopOver}
      />
    </Layout>
  )
}

export async function getStaticProps() {
  const response = await fetchAllClimbs()

  return {
    props: {
      allClimbs: response,
    },
  }
}

export default ClimbLog
