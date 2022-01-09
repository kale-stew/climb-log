import Image from 'next/image'
import FormattedDate from './Date'
import {
  addCommas,
  capitalizeEachWord,
  feetToMeters,
  milesToKilometers,
} from '../utils/helpers'
import { buildAreaName } from '../utils/builders'

import styles from './CustomPopover.module.css'
import utilStyles from '../styles/utils.module.css'

const CustomPopover = ({ climb, metric }) => {
  const buildTitle = () => {
    if (climb.slug) {
      return (
        <a href={`/hike/${climb.slug}`} alt={`View trip report from ${climb.title}`}>
          <h2 className={utilStyles.headingLg}>{climb.title} ↗</h2>
        </a>
      )
    } else {
      return <h2 className={utilStyles.headingLg}>{climb.title}</h2>
    }
  }

  return (
    <div
      className={
        climb.previewImgUrl
          ? `${styles.popoverContent} ${styles.contentWithImg}`
          : styles.popoverContent
      }
    >
      <header>
        {climb.previewImgUrl && (
          <Image
            src={climb.previewImgUrl}
            width="100%"
            height="100%"
            layout="responsive"
            objectFit="contain"
          />
        )}
        {buildTitle()}
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
          ? climb && `${addCommas(feetToMeters(climb.gain))} m`
          : climb && `${addCommas(climb.gain)}'`}
      </p>
      <p>
        <strong>Location:</strong> {buildAreaName(climb.area)},{' '}
        {capitalizeEachWord(climb.state)}
      </p>
      {climb.strava && (
        <a href={climb.strava} target="_blank" alt={`View '${climb.title}' on Strava`}>
          Check out this activity on Strava ↗
        </a>
      )}
    </div>
  )
}

export default CustomPopover
