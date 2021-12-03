import utilStyles from '../styles/util.module.css'
import styles from './Popover.module.css'

/**
 * Each Popover needs to have:
 *  - a button to close it
 *  - an icon, preferably pulled from the notion db item
 *  - a large title
 *  - the rest of the climb data cleanly rendered in the content subsection
 *  - a header image?
 */

const Popover = ({ climb }) => {
  return (
    <>
      <h2 className={`${utilStyles.headingLg} ${utilStyles.padding1px}`}>
        {climb.title}
      </h2>
      <Date dateString={climb.date} />
      <br />
      <p>Distance: {climb.distance}</p>
      <p>Elevation Gain: {climb.gain}</p>
      <p>
        Location: {climb.area}, {climb.state}
      </p>
    </>
  )
}

export default Popover
