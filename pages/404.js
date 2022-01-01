import Layout from '../components/Layout'
import Image from 'next/image'
import ImageGoats from '../public/photos/404.jpeg'
import { METADATA, PREVIEW_IMAGES } from '../utils/constants'
import { socialImage } from '../utils/social-image'

import utilStyles from '../styles/utils.module.css'

const baseName = '404'

const NotFoundPage = () => {
  return (
    <Layout>
      <h1>Well this is awkward...</h1>
      <Image src={ImageGoats} />
      <div className={utilStyles.vertical}>
        <h2>You've found a page that does not exist.</h2>
        <p>Click the home icon below ↓ to navigate back home</p>
      </div>
    </Layout>
  )
}

export async function getStaticProps() {
  const title = 'Page Not Found'
  const description = `${METADATA.NAME}: Photographer, hiker, and web developer.`

  return {
    props: {
      title,
      description,
      baseName,
      ...(await socialImage({
        title,
        description,
        previewImgUrl: PREVIEW_IMAGES.NOT_FOUND_IMAGE,
        baseName,
      })),
    },
  }
}

export default NotFoundPage
