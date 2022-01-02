import styles from './ImageGallery.module.css'

const ImageGallery = ({ photos }) => (
  <ul className={styles.galleryWrapper}>
    {photos.map((photo) => (
      <li key={photo.href}>
        <img src={photo.href} alt={photo.title} loading="lazy" />
      </li>
    ))}
    <li key={'end-li'}></li>
  </ul>
)

export default ImageGallery
