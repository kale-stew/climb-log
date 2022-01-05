import styles from './ImageGallery.module.css'
import utilStyles from '../styles/utils.module.css'
import { useEffect, useState } from 'react'

const ImageGallery = ({ header, photos }) => {
  const [isLargeDisplay, setLargeDisplay] = useState(true)
  useEffect(() => {
    const resize = (e) => {
      if (e.matches) {
        setLargeDisplay(true)
      } else {
        setLargeDisplay(false)
      }
    }
    let mQuery = window.matchMedia('(min-width: 1024px)')
    mQuery.addEventListener('change', resize)

    if (mQuery.matches) {
      setLargeDisplay(true)
    } else {
      setLargeDisplay(false)
    }

    return () => {
      mQuery.removeEventListener('change', resize)
    }
  }, [])

  const buildImage = (photo, isLarge) => {
    let tallImg = photo.height > photo.width
    return (
      <li
        key={photo.href}
        className={tallImg && isLarge ? styles.tallGalleryItem : styles.galleryItem}
      >
        <img
          src={photo.href}
          alt={photo.title}
          className={tallImg && isLarge ? styles.tallGalleryImg : ''}
          loading="lazy"
        />
        <div className={`${utilStyles.shownForMobile} ${styles.imageCaption}`}>
          <small>{photo.title}</small>
          {photo.area && <small>{`📍${photo.area}, ${photo.state}`}</small>}
        </div>
      </li>
    )
  }
  return (
    <>
      {photos.length !== 0 && <h2 key={header}>{header}</h2>}
      <ul className={styles.galleryWrapper}>
        {photos.map((photo) => buildImage(photo, isLargeDisplay))}
        <li key={'end-li'}></li>
      </ul>
    </>
  )
}

export default ImageGallery
