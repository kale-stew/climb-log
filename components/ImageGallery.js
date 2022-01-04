import styles from './ImageGallery.module.css'
import utilStyles from '../styles/utils.module.css'

const ImageGallery = ({ header, photos }) => (
  <>
    {photos.length !== 0 && <h2 key={header}>{header}</h2>}
    <ul className={styles.galleryWrapper}>
      {photos.map((photo) => {
        let tallImg = photo.height > photo.width
        return (
          <li
            key={photo.href}
            className={tallImg ? styles.tallGalleryItem : styles.galleryItem}
          >
            <img
              src={photo.href}
              alt={photo.title}
              className={tallImg ? styles.tallGalleryImg : ''}
              loading="lazy"
            />
            <div className={`${utilStyles.shownForMobile} ${styles.imageCaption}`}>
              <small>{photo.title}</small>
              {photo.area && <small>{`📍${photo.area}, ${photo.state}`}</small>}
            </div>
          </li>
        )
      })}
      <li key={'end-li'}></li>
    </ul>
  </>
)

export default ImageGallery
