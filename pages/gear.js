import Layout from '../components/Layout'
import { METADATA, PREVIEW_IMAGES } from '../utils/constants'
import { socialImage } from '../utils/social-image'

const NotFoundPage = ({ title }) => {
  return (
    <Layout>
      <h1>{title}</h1>
    </Layout>
  )
}

export async function getStaticProps() {
  const title = `${METADATA.FIRST_NAME}'s Gear`
  const description = `${METADATA.FULL_NAME}: Photographer, hiker, and web developer.`

  return {
    props: {
      title,
      description,
      ...(await socialImage({
        title,
        description,
        previewImgUrl: PREVIEW_IMAGES.GEAR_IMAGE,
        baseName: 'gear',
        bgColor: '#d3562c',
      })),
    },
  }
}

export default NotFoundPage
