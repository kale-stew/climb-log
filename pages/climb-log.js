import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import CustomHead from '../components/CustomHead'
import Layout from '../components/Layout'
import Table from '../components/Table'
import { TABLE_SORT_ORDER } from '../utils/constants'
import { fetchAllClimbs } from '../utils/notion'

const ClimbLog = ({ allClimbs }) => {
  const [metric, setMetric] = useState(false)
  const [data, setData] = useState(allClimbs)
  const [sortOrder, setSortOrder] = useState({
    property: 'date',
    direction: TABLE_SORT_ORDER.DESC,
  })
  const [allAreas, setAllAreas] = useState([])
  const [areaFilter, setAreaFilter] = useState('all')
  const [filteredClimbs, setFilteredClimbs] = useState(allClimbs)
  const [blanketEnabled, setBlanketEnabled] = useState(false)

  const router = useRouter()
  const firstUpdate = useRef(true)

  /**
   * refreshData usalizes Next.js's router to replace the path with the current one,
   * effectively going no where. But this does allow the page to re-render, because we're
   * now sending JSON to the React side of things instead of the full HTML like Next usually
   * does. It does cause a new API call, so maybe change this in the future?
   */
  const refreshData = () => router.replace(router.asPath)

  /**
   * sortData allows us to sort the data by area selected with the areaFilter state, or pass one in ourselves.
   * This is helpfull because it lets us persist sort orders along with whatever area filter the user selects.
   * Future sortOrder could also be added, all we would need to do is pass in another parameter with
   * it's corresponding state as a default value.
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
   * We want to use this useEffect to check and see if the sort order state has changed,
   * that way we can properly sort the data and update the table.
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
  }, [])

  const buildCategories = () => {
    // Unique climb areas become a new category to sort by (these are sorted alphabetically)
    let areaCategories = [...new Set(allClimbs.map((climb) => climb.area))]
      .sort((a, b) => {
        if (a < b) return -1
        if (a > b) return 1
        return 0
      })
      .map((area) => {
        // We have 2 different types of category in the same list, so let's make sure we include a "type" so
        // that we can later make sure we are filtering by that type
        return { text: `${area.trim()}`, value: area.trim(), type: 'area' }
      })
    // Unique climb states become a new category to sort by (these are sorted alphabetically)
    let stateCategories = [...new Set(allClimbs.map((climb) => climb.state))]
      .sort((a, b) => {
        if (a < b) return -1
        if (a > b) return 1
        return 0
      })
      .map((state) => {
        return { text: `all ${state.trim()}`, value: state.trim(), type: 'state' }
      })
    // Let's add the states to the top of the drop down
    areaCategories.unshift(...stateCategories)
    setAllAreas(areaCategories)
  }

  /**
   * When the user selects an area, let's set state accordingly
   * We're dealing with a state type and an area type, so the value of the dropdown item will look like "colorado?state"
   * or "san juans?area", this way we can filter the climbs object with variables depending on the filter type
   * @param {string} filter
   */
  const selectAreaFilter = (filter) => {
    let filterType = filter.split('?')[1]
    let selectedFilter = filter.split('?')[0]
    // Set the areaFilter so that the drop down can handle it's own state (we want it to be the "colorado?state" formatted value)
    setAreaFilter(filter)
    // If the area filter the user selects is "all", let's reset to allClimbs and make sure we sort based on the current order
    if (filter == 'all') {
      setFilteredClimbs(allClimbs)
      sortData(allClimbs, 'all') // sortData helps us do the reset^
      return
    }
    // Otherwise let's filter down to what we want based on the filter type
    let filteredData = allClimbs.filter(
      (climb) => climb[filterType].trim() == selectedFilter.trim()
    )
    setFilteredClimbs(filteredData)
    sortData(filteredData, selectedFilter)
  }

  const toggleBlanketEnabled = () => {
    if (blanketEnabled) {
      setBlanketEnabled(false)
    } else {
      setBlanketEnabled(true)
    }
  }

  return (
    <Layout>
      {/* This 'blanket' div allows us to dim the background on popup using css 🙌🏻 */}
      <div className={blanketEnabled ? 'blanket' : ''}></div>
      <CustomHead title={'Kylie Stewart | Climb Log'} />
      <Table
        data={data}
        sortOrder={sortOrder}
        setSortOrder={setSortOrder}
        metric={metric}
        setMetric={setMetric}
        allAreas={allAreas}
        areaFilter={areaFilter}
        setAreaFilter={selectAreaFilter}
        toggleBlanketEnabled={toggleBlanketEnabled}
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
