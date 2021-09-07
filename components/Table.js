import React from 'react'

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
   * Form Table Rows based on data type to allow
   * for conditional links (out to Strava & full trip report)
   */
  const buildTableRow = (key, climb) => {
    if (alwaysExclude.find((el) => el == key)) {
      // Sanitize rows to exclude extra data
      return
    } else if (climb.href && key == 'title') {
      // If there is a full page url, link it on the title
      return (
        <td key={climb.id}>
          <a href={climb.href} alt={`View ${climb[key]}`}>
            {climb[key]}
          </a>
        </td>
      )
    }

    // Default data row for all else
    return <td key={climb.id}>{climb[key]}</td>
  }

  return (
    <table>
      <caption>Climb Log</caption>
      <tbody>
        <tr>
          {headers.map((header, i) => (
            <th key={i}>{header}</th>
          ))}
        </tr>
        {data.map((climb, i) => (
          <tr class="cursor-pointer" key={i}>
            {Object.keys(climb).map((key, i) => buildTableRow(key, climb))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export default Table
