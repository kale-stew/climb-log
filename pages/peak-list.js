import { useState } from 'react'
import Layout from '../components/Layout'
import {
  CompletedCount,
  FilterButton,
  PeakCard,
  RankNumber,
} from '../components/PeakList.components'
import { METADATA, PREVIEW_CARD_COLORS, PREVIEW_IMAGES } from '../utils/constants'
import { fetchAllPeaks } from '../utils/data/peaks'
import { addCommas, checkMonth, checkYear, formatDate } from '../utils/helpers'
import { socialImage } from '../utils/social-image'

import styles from '../styles/peak-list.module.css'
import utilStyles from '../styles/utils.module.css'

export default function PeakListPage({ allPeaks, title }) {
  const [allPeaksData, setAllPeaks] = useState(allPeaks)
  const [filters, setFilters] = useState([])
  const COUNT_DONE = allPeaksData.filter((peak) => peak.first_completed).length

  const buildRangeArr = () => {
    const allRanges = allPeaks.map((peak) => peak.range)
    const seen = new Set()
    return allRanges.filter((el) => {
      const duplicate = seen.has(el.id)
      seen.add(el.id)
      return !duplicate
    })
  }

  const buildButtons = () => (
    <div style={{ display: 'inline', marginTop: '1.25rem' }}>
      <FilterButton
        key="all-button"
        color="fallback"
        onClick={() => setAllFilters('all')}
        isSelected={filters.length === 0}
        style={{ color: 'var(--color-text-primary)' }}
      >
        All Ranges
      </FilterButton>
      {buildRangeArr().map(({ id, name, color }) => (
        <FilterButton
          key={id}
          color={color}
          onClick={() => setAllFilters(name)}
          isSelected={filters.includes(name)}
        >
          {name}
        </FilterButton>
      ))}
    </div>
  )

  const setAllFilters = (str) => {
    let filtersState = filters
    if (str === 'all') {
      setFilters([])
      setAllPeaks(allPeaks)
      return
    }
    const maxedOut = filtersState.length >= 6
    const alreadySelected = filtersState.findIndex(
      (filter) => filter.toUpperCase() == str.toUpperCase()
    )
    let filtersToSet
    if (alreadySelected != -1) {
      filtersState.splice(alreadySelected, 1)
      filtersToSet = maxedOut ? [] : [...new Set([...filtersState])]
    } else {
      filtersToSet = maxedOut ? [] : [...new Set([str, ...filtersState])]
    }
    setFilters(filtersToSet)
    const filtered = allPeaks.filter((peak) => filtersToSet.includes(peak.range.name))
    setAllPeaks(maxedOut ? allPeaks : filtered)
    return
  }

  const searchPeaks = (query) => {
    let upperQuery = query.toUpperCase().trim()
    if (upperQuery == '') {
      setAllPeaks(allPeaks)
      return
    }

    let searchResults = allPeaksData.filter(
      (peak) =>
        peak.title?.toUpperCase().includes(upperQuery) ||
        peak.range?.name?.toUpperCase().includes(upperQuery) ||
        checkMonth(upperQuery, peak.first_completed) ||
        (!isNaN(upperQuery) && checkYear(Number(upperQuery), peak.first_completed))
    )

    setAllPeaks(searchResults)
  }

  return (
    <Layout>
      <div className={utilStyles.centerText}>
        <h1 className={utilStyles.headingXl}>{title}</h1>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            lineHeight: 1,
          }}
        >
          <p className={styles.description}>
            The 100 highest peaks in Colorado, sorted from tallest (Mount Elbert at
            14,433') to shortest (Dallas Peak at 13,809'). Ranking, if available, is
            listed to the left of the peak name. Peaks without a number are technically
            unranked.
          </p>
          <p className={styles.description}>
            Peaks that {METADATA.FIRST_NAME} has climbed have a colored background of an
            image she took on that mountain. The color aligns with the mountain range it
            lies in. For a complete key of the ranges, see the colored filters available
            below.
          </p>

          {/* Completed number of peaks in current view */}
          <CompletedCount>
            {COUNT_DONE} / {allPeaksData.length}
          </CompletedCount>

          {/* Preset queries as Filters */}
          {buildButtons()}

          <div style={{ marginBottom: '2rem' }}>
            {/* Search all Peaks */}
            <p>Search all peaks:</p>
            <input
              className={utilStyles.searchInput}
              type={'search'}
              placeholder="Try 'Sawatch' or 'July'"
              onChange={(e) => searchPeaks(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className={styles.peakListWrapper}>
        {allPeaksData.length !== 0 ? (
          allPeaksData.map((peak) => {
            const isCompleted = peak.first_completed ? true : false
            return (
              <PeakCard color={peak.range.color} isCompleted={isCompleted} img={peak.img}>
                <span className={styles.peakTitle}>
                  <RankNumber isCompleted={isCompleted}>{peak.rank}</RankNumber>
                  <h2>{peak.title}</h2>
                  <h3>{addCommas(peak.elevation)}'</h3>
                </span>
                {isCompleted && (
                  <span
                    style={{
                      display: 'flex',
                      flexDirection: 'row',
                      fontFamily: "'Playfair Display', serif",
                    }}
                  >
                    <p style={{ margin: 0, fontSize: '14px' }}>
                      <i>First summitted on:</i> {formatDate(peak.first_completed)}
                    </p>
                  </span>
                )}
              </PeakCard>
            )
          })
        ) : (
          <span
            style={{
              fontStyle: 'italic',
              display: 'flex',
              justifyContent: 'center',
              margin: '0 auto',
              width: 'inherit',
            }}
          >
            No peaks found for that query.
          </span>
        )}
      </div>
    </Layout>
  )
}

export async function getStaticProps() {
  const title = 'Centennial Summit Checklist'
  const description = `Peaks that ${METADATA.FIRST_NAME} has summitted.`
  const allPeaks = await fetchAllPeaks()

  return {
    props: {
      allPeaks,
      title,
      description,
      ...(await socialImage({
        title,
        description,
        previewImgUrl: PREVIEW_IMAGES.PEAK_LIST_IMAGE,
        baseName: 'peak-list',
        bgColor: PREVIEW_CARD_COLORS.blue,
      })),
    },
  }
}
