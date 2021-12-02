import React from 'react'
import { TABLE_SORT_ORDER } from '../utils/constants'
import TableRow from './TableRow'

/**
 * TO-DO
 * - [] button to switch between Imperial & Metric
 * - [] onClick in-table event for filtering by range
 * - [] onClick in-table event for filtering by state
 * - [x] sort ascending/descending order on  header click
 */

export default function Table({ data, filters, setFilters }) {
  const alwaysExclude = ['href', 'strava', 'id']

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
      <TableRow key={key} id={climb.id} title={key} data={climb[key]} metric={false} />
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
    if (header === filters.property) {
      if (filters.direction == TABLE_SORT_ORDER.ASC) {
        return `${header} ▲`
      }
      if (filters.direction == TABLE_SORT_ORDER.DESC) {
        return `${header} ▼`
      }
    }
    return header
  }

  return (
    <>
      <h1>Kylie's Climb Log</h1>
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
            <tr key={i}>{Object.keys(climb).map((key) => buildTableRow(key, climb))}</tr>
          ))}
        </tbody>
      </table>
    </>
  )
}
