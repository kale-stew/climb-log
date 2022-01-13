import { useState } from 'react'
import styled from '@emotion/styled'
import Layout from '../components/Layout'
import { COLORS, METADATA, PREVIEW_IMAGES } from '../utils/constants'
import { fetchAllPeaks } from '../utils/data/peaks'
import { addCommas, checkMonth, checkYear, formatDate } from '../utils/helpers'
import { socialImage } from '../utils/social-image'

import styles from '../styles/peak-list.module.css'
import utilStyles from '../styles/utils.module.css'

const FilterButton = styled.button`
  background-color: ${(p) => `var(--color-card-${p.color})`};
  color: var(--color-white);
  width: max-content;
  font-weight: 500;
  font-size: 14px;
  &:hover {
    box-shadow: 0 10px 20px var(--color-bg-tertiary), 0 6px 6px var(--color-bg-tertiary);
  }
`

const CompletedCount = styled.span`
  margin: 0 auto 1rem auto;
  font-weight: 600;
  font-size: 14px;
  background-color: var(--color-bg-tertiary);
  color: var(--color-white);
  width: max-content;
  padding: 0.25em 0.4em;
  border-radius: 5px;
`

const RankNumber = styled.span`
  font-size: 12px;
  font-weight: 400;
  color: ${(p) => (p.isCompleted ? 'var(--color-white' : 'var(--color-text-secondary)')};
`

const PeakCard = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  align-self: center;
  border-radius: 5px;
  margin: 0.5rem 0;
  width: 350px;
  font-weight: 600;
  ${(p) =>
    p.isCompleted
      ? `border: 2px solid var(--color-bg-secondary);
        color: var(--color-white);
        background-image: linear-gradient(to bottom, var(--color-card-bg), var(--color-card-${
          p.color
        })),
        url(${p.img ? p.img : '/photos/lander_top.jpg'});
        height: auto;
        background-size: cover;
        @media (max-width: 1024px) {
          max-height: 25vh;
        }
        padding: 0 1rem 2rem 1rem;`
      : `padding: 0 1rem;
        border: 2px solid var(--color-card-${p.color})`};
  @media (max-width: 1024px) {
    width: inherit;
    padding: auto 0.5em;
  }
`

export default function PeakListPage({ allPeaks, title }) {
  const [allPeaksData, setAllPeaks] = useState(allPeaks)
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

  const buildButtons = () => {
    const ranges = buildRangeArr()
    console.log(ranges)
    return (
      <div style={{ display: 'inline', marginTop: '1.25rem' }}>
        {ranges.map(({ id, name, color }) => (
          <FilterButton key={id} color={color}>
            {name}
          </FilterButton>
        ))}
      </div>
    )
  }

  const searchPeaks = (query) => {
    let upperQuery = query.toUpperCase().trim()
    if (upperQuery == '') {
      setAllPeaks(allPeaks)
      return
    }

    let searchResults = allPeaks.filter(
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
        <h1>{title}</h1>
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
            listed to the left of the peak name. Peaks without a number are technincally
            unranked.
          </p>
          <p className={styles.description}>
            Peaks that {METADATA.FIRST_NAME} has climbed have a colored background of an
            image she took on that mountain. The color aligns with the mountain range it
            lies in. For a complete key of the ranges, see the colored filters available
            below.
          </p>

          {/* Completed Count in Current View */}
          <CompletedCount>
            {COUNT_DONE} / {allPeaksData.length}
          </CompletedCount>

          {/* Preset Queries as Filters */}
          {/* 13er, 14er (by elevation, greaterThan) */}
          {/* ranges: Sangre de Cristo, San Juan, Front, Tenmile, Sawatch, Mosquito, Elk */}
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
          <i className={utilStyles.centerText}>
            No peaks found for that search, maybe try "elk".
          </i>
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
        bgColor: COLORS.blue,
      })),
    },
  }
}
