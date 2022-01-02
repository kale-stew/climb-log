import ImageGallery from '../components/ImageGallery'
import Layout from '../components/Layout'
import { METADATA, PREVIEW_IMAGES } from '../utils/constants'
import { socialImage } from '../utils/social-image'
import * as allPhotos from '../utils/data/DUMMY_DATA'

import utilStyles from '../styles/utils.module.css'

export default function AllPhotosPage({ title }) {
  return (
    <Layout>
      <h1 className={utilStyles.centerText}>{title}</h1>
      <ImageGallery photos={allPhotos} />
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
      allPhotos,
      ...(await socialImage({
        title,
        description,
        previewImgUrl: PREVIEW_IMAGES.FALLBACK_IMAGE,
        baseName: 'photos',
      })),
    },
  }
}
