import Link from 'next/link'
import Image from 'next/image'
import FormattedDate from '../components/Date'
import { PREVIEW_IMAGES } from '../utils/constants'

import styles from './Card.module.css'

const Card = ({ postData }) => (
  <div className={styles.card}>
    <div className={styles.headerImg}>
      <Image
        src={
          postData.previewImgUrl ? postData.previewImgUrl : PREVIEW_IMAGES.FALLBACK_IMAGE
        }
        width={'100%'}
        height={'100%'}
        layout="responsive"
      />
    </div>

    <div className={styles.cardText}>
      <h2 className={styles.cardTitle}>
        <Link href={postData.href}>{postData.title}</Link>
      </h2>
      <FormattedDate dateString={postData.date} withDOW />
      <p>{postData.description}</p>
    </div>
  </div>
)

export default Card
