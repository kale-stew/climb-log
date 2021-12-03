import styles from './Popover.module.css'
import utilStyles from '../styles/utils.module.css'
import {
  addCommas,
  feetToMeters,
  findMatchingSlug,
  milesToKilometers,
} from '../utils/helpers'
/**
 * Each Popover needs to have:
 *  - a button to close it (It can also be closed by clicking outside of the popover)
 *  - an icon, preferably pulled from the notion db item
 *  - [x] a large title
 *  - the rest of the climb data cleanly rendered in the content subsection
 *  - a header image?
 */

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
      <header className={styles.popoverHeader}>{buildTitle()}</header>
      <Date dateString={climb.date} />
      <br />
      <p>
        Distance:{' '}
        {metric
          ? climb && `${milesToKilometers(climb.distance)} km`
          : climb && `${climb.distance} mi`}
      </p>
      <p>
        Elevation Gain:{' '}
        {metric
          ? climb && `${feetToMeters(climb.gain)} m`
          : climb && `${addCommas(climb.gain)}'`}
      </p>
      <p>
        Location: {climb.area}, {climb.state}
      </p>
    </div>
  )
}

export default CustomPopover
