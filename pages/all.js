import ImageGallery from '../components/ImageGallery'
import Layout from '../components/Layout'
import { COLORS, METADATA, PREVIEW_IMAGES } from '../utils/constants'
import { lightFormat } from 'date-fns'
import { socialImage } from '../utils/social-image'

import utilStyles from '../styles/utils.module.css'
import { fetchAllImages } from '../utils/data/photos'

export default function AllPhotosPage({ title, allPhotos }) {
  const getAllYears = () => {
    const arr = allPhotos.map(({ date }) => {
      const year = lightFormat(new Date(date), 'y')
      return year
    })
    return Array.from(new Set(arr))
  }

  const filterByYear = (arr, year) => arr.filter(({ date }) => date.indexOf(year) >= 0)

  return (
    <Layout>
      <h1 className={utilStyles.centerText}>{title}</h1>
      {getAllYears().map((year) => {
        const filteredPhotos = filterByYear(allPhotos, year)
        return (
          <ImageGallery key={`${year}-gallery`} photos={filteredPhotos} header={year} />
        )
      })}
    </Layout>
  )
}

export async function getStaticProps() {
  const title = 'All Photos'
  const description = `${METADATA.FULL_NAME} is a photographer, hiker, and web developer.`
  const response = await fetchAllImages()

  return {
    props: {
      title,
      description,
      allPhotos: response,
      ...(await socialImage({
        title,
        description,
        previewImgUrl: PREVIEW_IMAGES.ALL_PHOTOS_IMAGE,
        baseName: 'photos',
        bgColor: COLORS.blue,
      })),
    },
  }
}
