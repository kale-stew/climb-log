import React from 'react'
import TableRow from './TableRow'

/**
 * TO-DO
 * - [] button to switch between Imperial & Metric
 * - [] onClick in-table event for filtering by range
 * - [] onClick in-table event for filtering by state
 * - [] react-table hook to sort asc/desc by header
 */

const Table = ({ data }) => {
  const alwaysExclude = ['href', 'strava', 'id']

  /**
   * Create an arr of Table Headers by mapping over
   * climb data so headers are never out of sync
   */
  const headers = Object.keys(data[0]).filter(
    (header) => !alwaysExclude.find((el) => el == header)
  )

  /**
   * Form Table Rows based on data type
   */
  const buildTableRow = (key, climb) => {
    if (alwaysExclude.find((el) => el == key)) {
      // Sanitize rows to exclude extra data
      return
    }

    return <TableRow key={key} id={climb.id} title={key} data={climb[key]} metric={false} />
  }

  const sortRow = (header) => {
    console.log("Clicked:", header)
    switch(header) {
      case 'date':
        console.log("SORT DATE")
        break
      case 'title':
        console.log("SORT TITLE")
        break
      case 'distance':
        console.log("SORT DISTANCE")
        break
      case 'gain':
        console.log("SORT GAIN")
        break
      case 'area':
        console.log("SORT AREA")
        break
      case 'state':
        console.log("SORT STATE")
        break
      default:
        console.log("DEFAULT")
    }
  }

  return (
    <table>
      <caption>Kylie's Climb Log</caption>
      <tbody>
        <tr>
          {headers.map((header, i) => (
            <th key={i} onClick={() => sortRow(header)}>
              {header}
            </th>
          ))}
        </tr>
        {data.map((climb, i) => (
          <tr key={i}>{Object.keys(climb).map((key) => buildTableRow(key, climb))}</tr>
        ))}
      </tbody>
    </table>
  )
}

export default Table
