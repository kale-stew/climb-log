import Layout from '../components/Layout'
import { COLORS, METADATA, PREVIEW_IMAGES } from '../utils/constants'
import { fetchAllPeaks } from '../utils/data/peaks'
import { addCommas, formatDate } from '../utils/helpers'
import { socialImage } from '../utils/social-image'

const PeakListPage = ({ allPeaks, title }) => {
  return (
    <Layout>
      <h1>{title}</h1>
      <p>The 100 highest peaks in Colorado.</p>
      {allPeaks.map((peak) => (
        <div
          style={{
            border: '1px solid grey',
            display: 'flex',
            flexDirection: 'row',
            gap: '1.5rem',
            alignItems: 'center',
          }}
        >
          <h2>{peak.title}</h2>
          <h3>{addCommas(peak.elevation)}</h3>
          {peak.first_completed && <p>{formatDate(peak.first_completed)}</p>}
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
