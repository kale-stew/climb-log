import Image from 'next/image'
import { METADATA } from '../utils/constants'
import styles from './ResponsiveImage.module.css'

/**
 * A wrapper for next/image that allows us to provide two different imageSources
 * to serve up at a standard mobile breakpoint (724px). Custom styles can be
 * supplied via the `mobileCn` prop.
 */
const ResponsiveImage = ({
  altTxt = `An image taken by ${METADATA.NAME}.`,
  desktopDimensions = { width: '100%', height: '100%' },
  desktopImg,
  mobileDimensions = { width: '100%', height: '100%' },
  mobileImg,
  mobileCn = '',
  wrapperCn = '',
}) => {
  return (
    <>
      <div className={`${styles.imageFullWrapper} ${wrapperCn}`}>
        <Image
          src={desktopImg}
          width={desktopDimensions.width}
          height={desktopDimensions.height}
          layout="intrinsic"
          alt={altTxt}
        />
      </div>
      <div className={styles.imageMobileWrapper}>
        <Image
          className={mobileCn}
          src={mobileImg}
          width={mobileDimensions.width}
          height={mobileDimensions.height}
          layout="intrinsic"
          alt={altTxt}
        />
      </div>
    </>
  )
}

export default ResponsiveImage