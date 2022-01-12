import Layout from '../components/Layout'
import { COLORS, METADATA, PREVIEW_IMAGES } from '../utils/constants'
import { fetchAllPeaks } from '../utils/data/peaks'
import { socialImage } from '../utils/social-image'

// import utilStyles from '../styles/utils.module.css'

const PeakListPage = ({ allPeaks, title }) => {
  return (
    <Layout>
      <h1>{title}</h1>
      <p>Peaks that {METADATA.FIRST_NAME} has summitted.</p>
      {allPeaks.map((peak) => peak.title)}
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
