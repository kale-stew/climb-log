import Link from 'next/link'
import FormattedDate from '../components/Date'
import styles from './Card.module.css'

const Card = ({ postData }) => (
  <div className={styles.card}>
    <h2 className={styles.cardHeader}>
      <Link href={postData.href}>{`${postData.title} ↗`}</Link>
    </h2>
    <FormattedDate dateString={postData.date} withDOW />
    <p>{postData.description}</p>
  </div>
)

export default Card
