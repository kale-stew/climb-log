import Layout from '../components/Layout'
import { COLORS, METADATA, PREVIEW_IMAGES } from '../utils/constants'
import { socialImage } from '../utils/social-image'

// import utilStyles from '../styles/utils.module.css'

const PeakListPage = ({ title }) => {
  return (
    <Layout>
      <h1>{title}</h1>
      <p>Peaks that {METADATA.FIRST_NAME} has summitted.</p>
    </Layout>
  )
}

export async function getStaticProps() {
  const title = 'Centennial Summit Checklist'
  const description = `Peaks that ${METADATA.FIRST_NAME} has summitted.`

  return {
    props: {
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
