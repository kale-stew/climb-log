import Layout from '../components/Layout'
import Image from 'next/image'
import ImageGoats from '../public/photos/404.jpeg'
import { METADATA, PREVIEW_IMAGES } from '../utils/constants'
import { socialImage } from '../utils/social-image'

import utilStyles from '../styles/utils.module.css'

const NotFoundPage = () => {
  return (
    <Layout>
      <h1 className={utilStyles.headingXl}>Well this is awkward...</h1>
      <Image
        src={ImageGoats}
        style={{
          maxWidth: '100%',
          height: 'auto',
        }}
      />
      <div className={utilStyles.vertical}>
        <h2>You've found a page that does not exist.</h2>
        <p>Click the home icon below ↓ to navigate back home</p>
      </div>
    </Layout>
  )
}

export async function getStaticProps() {
  const title = 'Page Not Found'
  const description = `${METADATA.FULL_NAME}: Photographer, hiker, and web developer.`

  return {
    props: {
      title,
      description,
      ...(await socialImage({
        title,
        description,
        previewImgUrl: PREVIEW_IMAGES.NOT_FOUND_IMAGE,
        baseName: '404',
        bgColor: '#3381cc',
      })),
    },
  }
}

export default NotFoundPage
