import { Popover } from 'react-tiny-popover'
import CustomPopover from './CustomPopover'
import TableRow from './TableRow'
import { event } from '../utils/gtag'
import { CATEGORY_TYPE, TABLE_SORT_ORDER, METADATA } from '../utils/constants'

import categoryStyles from './Category.module.css'
import styles from './Table.module.css'
import utilStyles from '../styles/utils.module.css'

export default function Table({
  allAreas,
  areaFilter,
  data,
  isPopoverOpen,
  metric,
  rowClicked,
  setAreaFilter,
  setMetric,
  setSortOrder,
  setUserSearch,
  sortOrder,
  togglePopOver,
}) {
  // Notion data vals we -don't- want in the Table
  const alwaysExclude = ['href', 'id', 'previewImgUrl', 'slug', 'strava']

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
      <TableRow
        key={key}
        id={climb.id}
        title={key}
        data={climb[key]}
        metric={metric}
        slug={climb.slug}
      />
    )
  }

  const sortColumn = (header) => {
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
        formatted = `${header} ▼`
      }
      if (sortOrder.direction == TABLE_SORT_ORDER.DESC) {
        formatted = `${header} ▲`
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
        placeholder="Filter by area"
        className={styles.areaFilter}
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
    event(
      'gtm.click',
      `${isMetric ? 'metric' : 'imperial'}`,
      `https://www.kylies.photos/climb-log`,
      'UntiToggle',
      `${METADATA.SITE_NAME} | Climb Log`
    )
    setMetric(isMetric)
  }

  return (
    <>
      <div className={styles.tableHeaders}>
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
        <div className={`${utilStyles.singleRow} ${styles.areaFilter}`}>
          <p className={styles.filterTitle}>Filter by area:</p>
          {buildFilterByArea()}
        </div>
        {/* Search all Climbs */}
        <div className={`${utilStyles.singleRow} ${styles.searchFilter}`}>
          <p className={styles.filterTitle}>Search all entries:</p>
          <input
            className={styles.searchInput}
            type={'search'}
            placeholder="Try 'October' or 'Attempt'"
            onChange={(e) => {
              setUserSearch(e.target.value)
            }}
          />
        </div>
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
                onClick={() => sortColumn(header)}
              >
                {formatHeader(header)}
              </th>
            ))}
          </tr>

          {data.length == 0
            ? 'No Data Found'
            : data.map((climb, i) => (
                <Popover
                  containerClassName={styles.tablePopover}
                  key={climb.id}
                  onClickOutside={() => togglePopOver(i, climb)}
                  isOpen={isPopoverOpen && rowClicked === i}
                  positions={['center', 'bottom']} // in order of priority
                  content={<CustomPopover climb={climb} metric={metric} />}
                >
                  <tr
                    id={`tableRow${i}`}
                    className={`tableRow`}
                    key={i}
                    onClick={(e) => {
                      // If we're clicking on a link don't show the popover
                      if (e.target.nodeName == 'A') {
                        return
                      }
                      togglePopOver(i)
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
