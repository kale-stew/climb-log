import FormattedDate from './Date'
import {
  addCommas,
  feetToMeters,
  findMatchingSlug,
  milesToKilometers,
} from '../utils/helpers'

import styles from './CustomPopover.module.css'
import utilStyles from '../styles/utils.module.css'

const CustomPopover = ({ climb, metric }) => {
  const buildTitle = () => {
    if (findMatchingSlug(climb.title)) {
      return (
        <a
          href={`/${findMatchingSlug(climb.title)}`}
          alt={`View trip report from ${climb.title}`}
        >
          <h2 className={`${utilStyles.headingLg} ${utilStyles.padding1px}`}>
            {climb.title}
          </h2>
        </a>
      )
    } else {
      return (
        <h2 className={`${utilStyles.headingLg} ${utilStyles.padding1px}`}>
          {climb.title}
        </h2>
      )
    }
  }

  return (
    <div className={styles.popoverContent}>
      <header>
        {buildTitle()}
        {climb.imgUrl ? <img src={climb.imgUrl} /> : null}
      </header>

      <FormattedDate dateString={climb.date} withDOW />
      <br />
      <p>
        <strong>Distance:</strong>{' '}
        {metric
          ? climb && `${milesToKilometers(climb.distance)} km`
          : climb && `${climb.distance} mi`}
      </p>
      <p>
        <strong>Elevation Gain:</strong>{' '}
        {metric
          ? climb && `${feetToMeters(climb.gain)} m`
          : climb && `${addCommas(climb.gain)}'`}
      </p>
      <p>
        <strong>Location:</strong> {climb.area}, {climb.state}
      </p>
    </div>
  )
}

export default CustomPopover
