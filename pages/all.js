import ImageGallery from '../components/ImageGallery'
import Layout from '../components/Layout'
import { COLORS, METADATA, PREVIEW_IMAGES } from '../utils/constants'
import { socialImage } from '../utils/social-image'

import utilStyles from '../styles/utils.module.css'
import { fetchAllImages } from '../utils/data/photos'
import { checkMonth } from '../utils/helpers'
import { useState } from 'react'

export default function AllPhotosPage({ title, allPhotos }) {
  const [allPhotosPure, setAllPhotos] = useState(allPhotos)
  const [allPhotosData, setAllPhotosData] = useState(allPhotos)

  /**
   * Searches all phots by month, photo title, state, and area (as of 01/02/2022)
   * @param {String} query
   * @returns {null}
   */
  const searchPhotos = (query) => {
    let upperQuery = query.toUpperCase().trim()

    // Set photos list back to all if the search query is blank
    if (upperQuery == '') {
      setPhotosData()
      return
    }

    // Otherwise search for the query
    let searchResults = allPhotos.filter((photo) => {
      return (
        photo.title.toUpperCase().includes(upperQuery) ||
        checkMonth(upperQuery, photo.date) ||
        photo.area?.toUpperCase().includes(upperQuery) ||
        photo.state?.toUpperCase().includes(upperQuery)
      )
    })

    setPhotosData(searchResults)
  }

  /**
   * This function will set which photos are displayed by updating the state: allPhotosData.
   * If nothing is passed to the function, it will display all of the photos in the all-photos database.
   * This is done by setting the state: allPhotosPure, to the notion database response.
   * @param {Array} photosToDisplay
   */
  const setPhotosData = (photosToDisplay = allPhotosPure) => {
    setAllPhotosData(photosToDisplay)
  }

  return (
    <Layout>
      <h1 className={utilStyles.centerText}>{title}</h1>

      {/* Search Photos */}
      <div className={`${utilStyles.singleRow}`}>
        <p className={'styles.filterTitle' /*TODO: fix styles*/}>Search all entries:</p>
        <input
          className={'styles.searchInput'} // TODO: fix styles
          type={'search'}
          placeholder="Try 'October' or 'Sunset'"
          onChange={(e) => searchPhotos(e.target.value)}
        />
      </div>

      <ImageGallery photos={allPhotosData} />
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
