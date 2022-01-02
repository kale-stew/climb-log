import Layout from '../components/Layout'
import { METADATA, PREVIEW_IMAGES } from '../utils/constants'
import { socialImage } from '../utils/social-image'

// import utilStyles from '../styles/utils.module.css'

const AllPhotosPage = ({ title }) => {
  return (
    <Layout>
      <h1>{title}</h1>
    </Layout>
  )
}

export async function getStaticProps() {
  const title = 'All Photos'
  const description = `${METADATA.FULL_NAME} is a photographer, hiker, and web developer.`

  return {
    props: {
      title,
      description,
      ...(await socialImage({
        title,
        description,
        previewImgUrl: PREVIEW_IMAGES.FALLBACK_IMAGE,
        baseName: 'photos',
      })),
    },
  }
}

export default AllPhotosPage
