import styles from './ImageGallery.module.css'

const ImageGallery = ({ photos }) => (
  <ul className={styles.galleryWrapper}>
    {photos.map((photo) => (
      <li key={photo.src}>
        <img src={photo.src} alt={photo.alt} loading="lazy" />
      </li>
    ))}
    <li></li>
  </ul>
)

export default ImageGallery
