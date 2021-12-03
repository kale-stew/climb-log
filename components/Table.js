import React, { useState } from 'react'
import { TABLE_SORT_ORDER } from '../utils/constants'
import TableRow from './TableRow'
import utilStyles from '../styles/utils.module.css'

export default function Table({ data, filters, setFilters }) {
  const alwaysExclude = ['href', 'strava', 'id']
  const [metric, setMetric] = useState(false)
  /**
   * Create an arr of Table Headers by mapping over
   * climb data so headers are never out of sync
   */
  const headers =
    data.length > 0
      ? Object.keys(data[0]).filter((header) => !alwaysExclude.find((el) => el == header))
      : []

  /**
   * Form Table Rows based on data type
   */
  const buildTableRow = (key, climb) => {
    if (alwaysExclude.find((el) => el == key)) {
      // Sanitize rows to exclude extra data
      return
    }

    return (
      <TableRow key={key} id={climb.id} title={key} data={climb[key]} metric={metric} />
    )
  }

  const sortRow = (header) => {
    // User has clicked on a different header than what was previously being sorted
    if (header != filters.property) {
      setFilters({ property: header, direction: TABLE_SORT_ORDER.DESC })
      return
    }

    if (filters.direction == TABLE_SORT_ORDER.DESC) {
      setFilters({ property: header, direction: TABLE_SORT_ORDER.ASC })
    }
    if (filters.direction == TABLE_SORT_ORDER.ASC) {
      setFilters({ property: header, direction: TABLE_SORT_ORDER.DESC })
    }
  }

  const formatHeader = (header) => {
    let formatted = header
    if (header === filters.property) {
      if (filters.direction == TABLE_SORT_ORDER.ASC) {
        formatted = `${header} ▲`
      }
      if (filters.direction == TABLE_SORT_ORDER.DESC) {
        formatted = `${header} ▼`
      }
    }
    return formatted
  }

  return (
    <>
      <h1>Kylie's Climb Log</h1>
      <div className={utilStyles.singleRow}>
          <button className={metric ? "categoryButton" : utilStyles.categorySelected}
          onClick={() => setMetric(false)}>
          Imperial
          </button>
          <button className={metric ? utilStyles.categorySelected : "categoryButton"}
          onClick={() => setMetric(true)}>
          Metric
          </button>
        </div>
      <table>
        <caption>
          Click on a header to sort ascending by that value, again for the inverse.
        </caption>
        <tbody>
          <tr>
            {headers.map((header, i) => (
              <th key={i} className={`${header}Header`} onClick={() => sortRow(header)}>
                {formatHeader(header)}
              </th>
            ))}
          </tr>
          {data.map((climb, i) => (
            <tr key={i}>{Object.keys(climb).map(key => buildTableRow(key, climb))}</tr>
          ))}
        </tbody>
      </table>
    </>
  )
}
