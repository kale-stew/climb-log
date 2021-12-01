import { useState, useEffect, useRef, useLayoutEffect } from 'react'
import Head from 'next/head'
import Layout from '../components/Layout'
import Table from '../components/Table'
import { fetchAllClimbs, sortAllClimbs } from '../utils/notion'
import { TABLE_SORT_ORDER } from '../utils/constants'

const ClimbLog = ({ allClimbs }) => {
  const [data, setData] = useState(allClimbs)
  const [filters, setFilters] = useState({property: 'date', direction: TABLE_SORT_ORDER.DEFAULT})

  // Right now this breaks with a cannot fetch in notion.js on notion.databases.query :thinking:
  // const firstUpdate = useRef(true)
  // useLayoutEffect(() => {
  //   const sortData = async () => {
  //     const sortedData = await sortAllClimbs(filters)
  //     setData(sortedData)
  //   }

  //   if(firstUpdate.current) {
  //     firstUpdate.current = false
  //     return
  //   }

  //   console.log("USE EFFECT:", filters)
  //   sortData()
  // })

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
