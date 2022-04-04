import Gallery from 'react-grid-gallery'
import Layout from '../components/Layout'
import Link from 'next/link'
import { METADATA, PREVIEW_CARD_COLORS, PREVIEW_IMAGES } from '../utils/constants'
import { checkMonth, checkYear, filterByYear } from '../utils/helpers'
import { fetchAllImages } from '../utils/data/photos'
import { lightFormat } from 'date-fns'
import { socialImage } from '../utils/social-image'
import { useState } from 'react'

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
        photo.searchTags?.toUpperCase().includes(upperQuery) ||
        photo.caption.toUpperCase().includes(upperQuery) ||
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

  return (
    <Layout>
      <h1 className={`${utilStyles.centerText} ${utilStyles.headingXl}`}>{title}</h1>
      <div className={`${utilStyles.centerText} ${utilStyles.pageDescription}`}>
        A selection of photos that {METADATA.FIRST_NAME} has taken on her hikes and climbs
        over the years, sorted descending by date taken. Some of these photos are used as
        headers for entries on the <Link href="/climb-log">climb log</Link>, others are
        used in <Link href="/blog">blog posts</Link>.
      </div>
      <div className={`${utilStyles.centerText} ${utilStyles.pageDescription}`}>
        You are currently viewing <strong>{allPhotosData.length}</strong> of{' '}
        <strong>{allPhotos.length}</strong> available photos.
      </div>
      <div className={`${utilStyles.singleRow} ${styles.filterWrapper}`}>
        {/* Search all Photos */}
        <p>Search all entries:</p>
        <input
          className={utilStyles.searchInput}
          type={'search'}
          placeholder="Try '2020', 'wildlife', or 'sun'"
          onChange={(e) => searchPhotos(e.target.value)}
        />
      </div>

      <div className={utilStyles.vertical}>
        {getAllYears().map((year) => {
          const filteredPhotos = filterByYear(allPhotosData, year)
          return (
            <div key={`${year}-gallery`}>
              {filteredPhotos.length !== 0 && <h2 key={year}>{year}</h2>}
              <Gallery
                images={filteredPhotos}
                backdropClosesModal={true}
                enableImageSelection={false}
              />
            </div>
          )
        })}
      </div>
    </Layout>
  )
}

export async function getStaticProps() {
  const title = 'All Photos'
  const description = `${METADATA.FULL_NAME} is a photographer, hiker, and web developer.`
  const response = await fetchAllImages()
  const allPhotos = response.filter((photo) => photo.exclude !== true)

  return {
    props: {
      title,
      description,
      allPhotos,
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
