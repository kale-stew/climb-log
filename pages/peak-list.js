import Layout from '../components/Layout'
import { COLORS, METADATA, PREVIEW_IMAGES } from '../utils/constants'
import { fetchAllPeaks } from '../utils/data/peaks'
import { addCommas } from '../utils/helpers'
import { socialImage } from '../utils/social-image'

// import utilStyles from '../styles/utils.module.css'

const PeakListPage = ({ allPeaks, title }) => {
  return (
    <Layout>
      <h1>{title}</h1>
      <p>The 100 highest peaks in Colorado.</p>
      {allPeaks.map((peak) => (
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            gap: '2.5em',
            alignItems: 'center',
          }}
        >
          <h2>{peak.title}</h2>
          <h3>{addCommas(peak.elevation)}</h3>
          <p>{peak.number_of_summits.rollup.number}</p>
        </div>
      ))}
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
