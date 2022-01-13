import styled from '@emotion/styled'
import Layout from '../components/Layout'
import { COLORS, METADATA, PREVIEW_IMAGES } from '../utils/constants'
import { fetchAllPeaks } from '../utils/data/peaks'
import { addCommas, formatDate } from '../utils/helpers'
import { socialImage } from '../utils/social-image'

import styles from '../styles/peak-list.module.css'
import utilStyles from '../styles/utils.module.css'

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
  width: 420px;
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

const PeakListPage = ({ allPeaks, title }) => {
  const COUNT_DONE = allPeaks.filter((peak) => peak.first_completed).length
  return (
    <Layout>
      <div className={utilStyles.centerText}>
        <h1>{title}</h1>
        <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'center' }}>
          <p>The 100 highest peaks in Colorado.</p>
          <p style={{ marginLeft: '1ch' }}>
            {COUNT_DONE}/{allPeaks.length}
          </p>
        </div>
      </div>

      <div className={styles.peakListWrapper}>
        {allPeaks.map((peak) => {
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
        })}
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

export default PeakListPage