import { CATEGORY_TYPE } from '../utils/constants'
import utilStyles from '../styles/utils.module.css'

const Category = ({ category }) => {
  switch (category) {
    case CATEGORY_TYPE.GEAR:
      return <div className={utilStyles.gearCategory}>gear</div>
    case CATEGORY_TYPE.THOUGHTS:
      return <div className={utilStyles.thoughtsCategory}>thoughts</div>
    case CATEGORY_TYPE.HIKE:
      return <div className={utilStyles.hikeCategory}>trip reports</div>
  }
}

export default Category
