import { formatDate } from '../utils/helpers'
import { parseISO } from 'date-fns'
import utilStyles from '../styles/utils.module.css'

const FormattedDate = ({ dateString, withDOW, className = '' }) => {
  const date = typeof dateString === Date ? dateString : parseISO(dateString)

  return (
    <time className={`${utilStyles.lightText} ${className}`} dateTime={dateString}>
      {withDOW ? formatDate(date, 'long') : formatDate(date)}
    </time>
  )
}

export default FormattedDate
