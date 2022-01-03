import styles from './ImageGallery.module.css'
import utilStyles from '../styles/utils.module.css'

const ImageGallery = ({ header, photos }) => (
  <>
    {photos.length !== 0 && <h2 key={header}>{header}</h2>}
    <ul className={styles.galleryWrapper}>
      {photos.map((photo) => (
        <li key={photo.href} className={styles.galleryItem}>
          <img src={photo.href} alt={photo.title} loading="lazy" />
          <div className={`${styles.imageCaption} ${utilStyles.shownForMobile}`}>
            <small>{photo.title}</small>
            {photo.area && <small>{`📍${photo.area}, ${photo.state}`}</small>}
          </div>
        </li>
      ))}
      <li key={'end-li'}></li>
    </ul>
  </>
)

export default ImageGallery
