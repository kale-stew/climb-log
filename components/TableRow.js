import { BsArrowUpRight } from 'react-icons/bs'
import {
  addCommas,
  capitalizeEachWord,
  feetToMeters,
  formatDate,
  milesToKilometers,
} from '../utils/helpers'
import { buildAreaName } from '../utils/builders'
import { parseISO } from 'date-fns'

import styles from './Table.module.css'

export default function TableRow({ id, title, data, metric, slug }) {
  switch (title) {
    case 'title':
      if (slug) {
        // Link to full page report if it exists
        return (
          <td key={id} className={styles.titleData}>
            <a href={`/hike/${slug}`} alt={`View trip report from ${data}`}>
              {data}
              <BsArrowUpRight style={{ marginLeft: '0.25em', maxHeight: '12px' }} />
            </a>
          </td>
        )
      } else
        return (
          <td key={id} className={styles.titleData}>
            {data}
          </td>
        )
    case 'date':
      const dateStr = parseISO(data)
      return (
        <>
          <td key={`${id}-short`} className={styles.hiddenOnDesktop}>
            {formatDate(dateStr, 'short')}
          </td>
          <td key={id} className={styles.hiddenInMobile}>
            {formatDate(dateStr)}
          </td>
        </>
      )
    case 'distance':
      return (
        <td key={id}>
          {metric ? data && `${milesToKilometers(data)} km` : data && `${data} mi`}
        </td>
      )
    case 'gain':
      return (
        <td key={id}>
          {metric
            ? data && `${addCommas(feetToMeters(data))} m`
            : data && `${addCommas(data)}'`}
        </td>
      )
    case 'state':
      return (
        <td key={id} className={styles.hiddenInMobile}>
          {capitalizeEachWord(data)}
        </td>
      )
    case 'area':
      return (
        <td key={id} className={`${styles.hiddenInMobile} ${styles.areaData}`}>
          {buildAreaName(data)}
        </td>
      )
    default:
      return <td key={id}>{data}</td>
  }
}
