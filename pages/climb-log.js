import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import Layout from '../components/Layout'
import Table from '../components/Table'
import {
  createAreaSelects,
  createAreaTypeSelects,
  createStateSelects,
} from '../utils/builders'
import {
  CATEGORY_TYPE,
  METADATA,
  PREVIEW_CARD_COLORS,
  PREVIEW_IMAGES,
  TABLE_SORT_ORDER,
} from '../utils/constants'
import { checkMonth, checkYear } from '../utils/helpers'
import { event } from '../utils/gtag'
import { fetchAllClimbs } from '../utils/data/climbs'
// import { socialImage } from '../utils/social-image'

import tableStyles from '../components/Table.module.css'
import utilStyles from '../styles/utils.module.css'

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
   */
  const selectAreaFilter = (filter) => {
    event(
      'gtm.click',
      filter,
      `https://www.${METADATA.SITE_NAME}${router.asPath}`,
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
      return climb[filterType]
        .toUpperCase()
        .trim()
        .includes(selectedFilter.toUpperCase().trim())
    })
    setFilteredClimbs(filteredData)
    sortData(filteredData, selectedFilter)
  }

  const searchClimbLog = (e) => {
    if (e === '') {
      setFilteredClimbs(allClimbs)
      sortData(allClimbs, CATEGORY_TYPE.ALL)
      setUserSearch(e)
      selectAreaFilter('all')
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
        checkMonth(searchQuery, date) ||
        (isNaN(searchQuery) ? null : checkYear(Number(searchQuery), date))
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
      <h1 className={`${utilStyles.centerText} ${utilStyles.headingXl}`}>
        {METADATA.FIRST_NAME}'s Climb Log
      </h1>
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
        userSearch={userSearch}
        sortOrder={sortOrder}
        togglePopOver={togglePopOver}
      />
    </Layout>
  )
}

export async function getStaticProps() {
  const allClimbs = await fetchAllClimbs()
  const title = `${METADATA.FIRST_NAME}'s Climb Log`
  const description = `All of ${METADATA.FIRST_NAME}'s trip reports and hiking stats.`

  return {
    props: {
      allClimbs,
      title,
      description,
      // ...(await socialImage({
      //   title,
      //   description,
      //   previewImgUrl: PREVIEW_IMAGES.CLIMB_LOG_IMAGE,
      //   baseName: 'climb-log',
      //   bgColor: PREVIEW_CARD_COLORS.navy,
      // })),
    },
  }
}

export default ClimbLog
