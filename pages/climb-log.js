import { useState, useEffect, useRef } from 'react'
import Head from 'next/head'
import Layout from '../components/Layout'
import Table from '../components/Table'
import { fetchAllClimbs } from '../utils/notion'
import { TABLE_SORT_ORDER } from '../utils/constants'
import { useRouter } from 'next/router'

const ClimbLog = ({ allClimbs }) => {
  const [data, setData] = useState(allClimbs)
  const [filters, setFilters] = useState({property: 'date', direction: TABLE_SORT_ORDER.DEFAULT})

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
   * We want to use this useEffect to check and see if the filters state has changed,
   * that way we can properly sort the data and update the table.
   */
  useEffect(() => {
    const sortData = () => {
      // Check to see what direction we're sorting by
      let sortBy = filters.direction === TABLE_SORT_ORDER.ASC ? -1 : 1

      // If we want desc order with date, we can use the origional data set because it's 
      // already sorted this way
      if(filters.property === 'date' && filters.direction === TABLE_SORT_ORDER.DESC) {
        setData(allClimbs)
        return
      }
      let sortedData = data.sort((a, b) => {
        if(filters.property != 'date') {
          if (a[filters.property] < b[filters.property]) return (-1 * sortBy)
          if (a[filters.property] > b[filters.property]) return (1 * sortBy)
          return 0
        } else {
          // Sort the date in ascending order
          let dateA = new Date(a[filters.property])
          let dateB = new Date (b[filters.property])
          return dateA - dateB
        }
        
      })
      setData(sortedData)
    }

    // We don't want this to cause the page to do too many re-renders,
    // so let's make sure we don't call the sorting function on the first
    // page load.
    if (firstUpdate.current) {
      firstUpdate.current = false
      return
    }

    sortData()
    // Force the data to update in the UI
    refreshData()
  }, [filters])

  return (
  <Layout>
    <Head>
      <title>Kylie Stewart | Climb Log</title>
    </Head>
    <Table data={data} filters={filters} setFilters={setFilters} />
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
