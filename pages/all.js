import { useState } from 'react'
import ImageGallery from '../components/ImageGallery'
import Layout from '../components/Layout'
import { METADATA, PREVIEW_CARD_COLORS, PREVIEW_IMAGES } from '../utils/constants'
import { checkMonth, checkYear } from '../utils/helpers'
import { fetchAllImages } from '../utils/data/photos'
import { lightFormat } from 'date-fns'
import { socialImage } from '../utils/social-image'

import styles from '../styles/all-photos.module.css'
import utilStyles from '../styles/utils.module.css'

export default function AllPhotosPage({ title, allPhotos }) {
  const [allPhotosPure, setAllPhotos] = useState(allPhotos)
  const [allPhotosData, setAllPhotosData] = useState(allPhotos)

  /**
   * Searches all phots by month, photo title, state, year, and area
   */
  const searchPhotos = (query) => {
    let upperQuery = query.toUpperCase().trim()

    // Set photos list back to all if the search query is blank
    if (upperQuery == '') {
      setPhotosData()
      return
    }

    // Otherwise search for the query
    let searchResults = allPhotos.filter(
      (photo) =>
        checkMonth(upperQuery, photo.date) ||
        photo.area?.toUpperCase().includes(upperQuery) ||
        photo.state?.toUpperCase().includes(upperQuery) ||
        photo.tags?.toUpperCase().includes(upperQuery) ||
        photo.title.toUpperCase().includes(upperQuery) ||
        (isNaN(upperQuery) ? null : checkYear(Number(upperQuery), photo.date))
    )

    setPhotosData(searchResults)
  }

  /**
   * Sets which photos are displayed by updating the state of allPhotosData
   * If nothing is passed to the function, display all of the photos in the
   * all-photos db by setting the state `allPhotosPure`, the original arr.
   */
  const setPhotosData = (photosToDisplay = allPhotosPure) => {
    setAllPhotosData(photosToDisplay)
  }

  const getAllYears = () => {
    const arr = allPhotosData.map(({ date }) => {
      const year = lightFormat(new Date(date), 'y')
      return year
    })
    return Array.from(new Set(arr))
  }

  const filterByYear = (arr, year) => arr.filter(({ date }) => date.indexOf(year) >= 0)

  return (
    <Layout>
      <h1 className={utilStyles.centerText}>{title}</h1>
      <div className={`${utilStyles.singleRow} ${styles.filterWrapper}`}>
        {/* Search all Photos */}
        <p>Search all entries:</p>
        <input
          className={utilStyles.searchInput}
          type={'search'}
          placeholder="Try 'Sunrise' or 'Goat'"
          onChange={(e) => searchPhotos(e.target.value)}
        />
      </div>

      {getAllYears().map((year) => {
        const filteredPhotos = filterByYear(allPhotosData, year)
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
        bgColor: PREVIEW_CARD_COLORS.blue,
      })),
    },
  }
}
