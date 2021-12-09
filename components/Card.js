// import FormattedDate from '../components/Date'
import styles from './Card.module.css'

const Card = ({ postData }) => (
  <div className={styles.card}>
    <h2>{postData.title}</h2>
    <small>{postData.date}</small>
    {/* <FormattedDate dateString={postData.date} /> */}
    <p>{postData.description}</p>
  </div>
)

export default Card
