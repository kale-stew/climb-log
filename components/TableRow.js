import {
  addCommas,
  capitalizeEachWord,
  feetToMeters,
  formatDate,
  milesToKilometers,
} from '../utils/helpers'
import { buildAreaName } from '../utils/builders'

import styles from './Table.module.css'

export default function TableRow({ id, title, data, metric, slug }) {
  switch (title) {
    case 'title':
      if (slug) {
        // Link to full page report if it exists
        return (
          <td key={id}>
            <a href={`/hike/${slug}`} alt={`View trip report from ${data}`}>
              {data} ↗
            </a>
          </td>
        )
      } else return <td key={id}>{data}</td>
    case 'date':
      const dateStr = new Date(data)
      return <td key={id}>{formatDate(dateStr)}</td>
    case 'distance':
      // Return either metric or imperial stats
      return (
        <td key={id}>
          {metric ? data && `${milesToKilometers(data)} km` : data && `${data} mi`}
        </td>
      )
    case 'gain':
      // Return either metric or imperial stats
      return (
        <td key={id}>
          {metric ? data && `${feetToMeters(data)} m` : data && `${addCommas(data)}'`}
        </td>
      )
    case 'state':
      // Hide row in mobile view
      return (
        <td key={id} className={styles.hiddenRow}>
          {capitalizeEachWord(data)}
        </td>
      )
    case 'area':
      // Hide row in mobile view
      return (
        <td key={id} className={styles.hiddenRow}>
          {buildAreaName(data)}
        </td>
      )
    default:
      return <td key={id}>{data}</td>
  }
}
