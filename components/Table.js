import React, { useState } from 'react'
import { Popover } from 'react-tiny-popover'
import CustomPopover from './CustomPopover'
import TableRow from './TableRow'
import { CATEGORY_TYPE, TABLE_SORT_ORDER, METADATA } from '../utils/constants'

import categoryStyles from './Category.module.css'
import styles from './Table.module.css'
import utilStyles from '../styles/utils.module.css'
import { event } from '../utils/gtag'

export default function Table({
  allAreas,
  areaFilter,
  data,
  metric,
  setAreaFilter,
  setMetric,
  setSortOrder,
  sortOrder,
  toggleBlanketEnabled,
}) {
  // Notion data vals we -don't- want in the Table
  const alwaysExclude = ['href', 'strava', 'id', 'imgUrl']

  const [isPopoverOpen, setIsPopoverOpen] = useState(false)
  const [rowClicked, setRowClicked] = useState(null)

  // Create an arr of Table Headers by mapping over data so headers are never out of sync
  const headers =
    data.length > 0
      ? Object.keys(data[0]).filter((header) => !alwaysExclude.find((el) => el == header))
      : []

  // Form Table Rows based on data type
  const buildTableRow = (key, climb) => {
    if (alwaysExclude.find((el) => el == key)) {
      // Sanitize rows to exclude extra data
      return
    }

    return (
      <TableRow key={key} id={climb.id} title={key} data={climb[key]} metric={metric} />
    )
  }

  const togglePopOver = (id, climb) => {
    if (isPopoverOpen) {
      toggleBlanketEnabled()
      setIsPopoverOpen(false)
      setRowClicked(null)
    } else {
      event('gtm.click', climb.title, `https://www.kylies.photos/climb-log`, 'TableClick', `${METADATA.SITE_NAME} | Climb Log`)
      toggleBlanketEnabled()
      setIsPopoverOpen(true)
      setRowClicked(id)
    }
  }

  const sortRow = (header) => {
    // User has clicked on a different header than what was previously being sorted
    if (header != sortOrder.property) {
      setSortOrder({ property: header, direction: TABLE_SORT_ORDER.DESC })
      return
    }

    if (sortOrder.direction == TABLE_SORT_ORDER.DESC) {
      setSortOrder({ property: header, direction: TABLE_SORT_ORDER.ASC })
    }
    if (sortOrder.direction == TABLE_SORT_ORDER.ASC) {
      setSortOrder({ property: header, direction: TABLE_SORT_ORDER.DESC })
    }
  }

  const formatHeader = (header) => {
    let formatted = header
    if (header === sortOrder.property) {
      if (sortOrder.direction == TABLE_SORT_ORDER.ASC) {
        formatted = `${header} ▲`
      }
      if (sortOrder.direction == TABLE_SORT_ORDER.DESC) {
        formatted = `${header} ▼`
      }
    }
    return formatted
  }

  const buildFilterByArea = () => {
    return (
      <select
        value={areaFilter}
        onChange={(e) => {
          setAreaFilter(e.target.value)
        }}
        placeholder="Filter by Area"
      >
        <option value={CATEGORY_TYPE.ALL}>All</option>
        {allAreas.map((area) => {
          return (
            <option key={area.value} value={`${area.value}?${area.type}`}>
              {area.text}
            </option>
          )
        })}
      </select>
    )
  }

  const toggleUnits = (isMetric) => {
    event('gtm.click', `${isMetric ? 'metric' : 'imperial'}`, `https://www.kylies.photos/climb-log`, 'UntiToggle', `${METADATA.SITE_NAME} | Climb Log`)
    setMetric(isMetric)
  }
  return (
    <>
      <h1>Kylie's Climb Log</h1>

      {/* Buttons: Switch between Imperial and Metric num values */}
      <div className={utilStyles.singleRow}>
        <button
          className={metric ? 'categoryButton' : categoryStyles.categorySelected}
          onClick={() => toggleUnits(false)}
        >
          Imperial
        </button>
        <button
          className={metric ? categoryStyles.categorySelected : 'categoryButton'}
          onClick={() => toggleUnits(true)}
        >
          Metric
        </button>
      </div>

      {/* Filter: by Area */}
      <div className={utilStyles.singleRow}>
        <p>Filter by Area:</p>
        {buildFilterByArea()}
      </div>
      <table>
        <caption>
          Click on a row to expand more details about that hike. Click on a header to sort
          ascending by that value, again for the inverse.
        </caption>
        <tbody>
          <tr>
            {headers.map((header, i) => (
              <th
                key={i}
                className={styles[`${header}Header`]}
                onClick={() => sortRow(header)}
              >
                {formatHeader(header)}
              </th>
            ))}
          </tr>
          {data.map((climb, i) => (
            <Popover
              containerClassName={styles.tablePopover}
              key={climb.id}
              onClickOutside={() => togglePopOver(i, climb)}
              isOpen={isPopoverOpen && rowClicked === i}
              positions={['center', 'bottom']} // in order of priority
              content={<CustomPopover climb={climb} metric={metric} />}
            >
              <tr
                className={'tableRow'}
                key={i}
                onClick={() => {
                  togglePopOver(i, climb)
                }}
              >
                {Object.keys(climb).map((key) => buildTableRow(key, climb))}
              </tr>
            </Popover>
          ))}
        </tbody>
      </table>
    </>
  )
}
