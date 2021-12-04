import { useState, useEffect, useRef } from 'react'
import Head from 'next/head'
import Layout from '../components/Layout'
import Table from '../components/Table'
import { fetchAllClimbs } from '../utils/notion'
import { TABLE_SORT_ORDER } from '../utils/constants'
import { useRouter } from 'next/router'

const ClimbLog = ({ allClimbs }) => {
  const [metric, setMetric] = useState(false)
  const [data, setData] = useState(allClimbs)
  const [sortOrder, setSortOrder] = useState({
    property: 'date',
    direction: TABLE_SORT_ORDER.DESC,
  })
  const [allAreas, setAllAreas] = useState([])
  const [areaFilter, setAreaFilter] = useState('All')
  const [filteredClimbs, setFilteredClimbs] = useState(allClimbs)

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
    // Force the data to update in the UI
    refreshData()
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
    // sortData()
    buildCategories()
  }, [])

  const buildCategories = () => {
    // Unique climb areas become a new category to sort by (these are sorted alphabetically)
    let categories = [...new Set(allClimbs.map((climb) => climb.area))].sort((a, b) => {
      if (a < b) return -1
      if (a > b) return 1
      return 0
    })
    setAllAreas(categories)
  }

  /**
   * When the user selects an area, let's set state accordingly
   * @param {string} filter
   */
  const selectAreaFilter = (filter) => {
    // If the area filter the user selects is "All", let's reset to allClimbs and make sure we sort based on the current order
    setAreaFilter(filter)
    if (filter == 'All') {
      setFilteredClimbs(allClimbs)
      sortData(allClimbs, 'All') // sortData helps us do the reset^
      return
    }
    // Otherwise let's filter down to what we want and sort it after.
    let filteredData = allClimbs.filter((climb) => climb.area.trim() == filter.trim())
    setFilteredClimbs(filteredData)
    sortData(filteredData, filter)
  }

  return (
    <Layout>
      <Head>
        <title>Kylie Stewart | Climb Log</title>
        <script
          async
          src="https://www.googletagmanager.com/gtag/js?id=G-W9WRKKHEN8"
        />

        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-W9WRKKHEN8', { page_path: window.location.pathname });
            `,
          }}
        />
      </Head>
      <Table
        data={data}
        sortOrder={sortOrder}
        setSortOrder={setSortOrder}
        metric={metric}
        setMetric={setMetric}
        allAreas={allAreas}
        areaFilter={areaFilter}
        setAreaFilter={selectAreaFilter}
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
