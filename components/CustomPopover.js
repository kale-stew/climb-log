import { BsArrowUpRight } from 'react-icons/bs'
import { FiExternalLink } from 'react-icons/fi'
import FormattedDate from './Date'
import Image from 'next/legacy/image'
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
          <h2 className={utilStyles.headingLg}>
            {climb.title}
            <BsArrowUpRight style={{ marginLeft: '0.25em', maxHeight: '18px' }} />
          </h2>
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
      <div>
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
      </div>

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
        <a
          href={climb.strava}
          target="_blank"
          alt={`View '${climb.title}' on Strava`}
          className={utilStyles.singleRow}
        >
          View this activity on Strava
          <FiExternalLink style={{ marginLeft: '0.25em', maxHeight: '14px' }} />
        </a>
      )}
    </div>
  )
}

export default CustomPopover
