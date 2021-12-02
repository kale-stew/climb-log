import { parseISO, format } from 'date-fns'
import utilStyles from '../styles/utils.module.css'

const Date = ({ dateString }) => {
  const date = parseISO(dateString)
  return (
    <time className={utilStyles.lightText} dateTime={dateString}>
      {format(date, 'LLLL d, yyyy')}
    </time>
  )
}

export default Date
