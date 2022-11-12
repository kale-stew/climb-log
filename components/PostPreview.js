import Link from 'next/link'
import Image from 'next/legacy/image'
import FormattedDate from './Date'
import { PREVIEW_IMAGES } from '../utils/constants'

import styles from './PostPreview.module.css'

const PostPreview = ({ postData }) => {
  const isClimb = postData.href.indexOf('/climb-log?') === 0

  return (
    <Link href={postData.href}>
      <div className={styles.card}>
        <div className={styles.headerImg}>
          <Image
            src={
              postData.previewImgUrl
                ? postData.previewImgUrl
                : PREVIEW_IMAGES.FALLBACK_IMAGE
            }
            layout="fill"
          />
        </div>

        <div className={styles.cardText}>
          <div className={styles.cardTitle}>
            <Link href={postData.href}>
              <h2>{postData.title}</h2>
            </Link>
            {isClimb ? <h4>→ on the Climb Log</h4> : null}
          </div>
          <FormattedDate dateString={postData.date} withDOW />
          <p>{postData.description}</p>
        </div>
      </div>
    </Link>
  )
}

export default PostPreview
