import { useRouter } from 'next/router'
import { CATEGORY_TYPE, ROLE_NAVIGATION } from '../utils/constants'

import styles from './Category.module.css'

const Category = ({ category, pushToRouter }) => {
  const router = useRouter()

  const pushProps = (category) => {
    if (!pushToRouter) return
    router.push({
      pathname: '/blog',
      query: category,
    })
  }

  switch (category) {
    case CATEGORY_TYPE.GEAR:
      return (
        <div
          onClick={() => pushProps(CATEGORY_TYPE.GEAR)}
          className={
            pushToRouter
              ? `${styles.gearCategory} ${styles.categoryLink}`
              : styles.gearCategory
          }
          role={pushToRouter ? ROLE_NAVIGATION : ''}
        >
          gear
        </div>
      )
    case CATEGORY_TYPE.THOUGHTS:
      return (
        <div
          onClick={() => pushProps(CATEGORY_TYPE.THOUGHTS)}
          className={
            pushToRouter
              ? `${styles.thoughtsCategory} ${styles.categoryLink}`
              : styles.thoughtsCategory
          }
          role={pushToRouter ? ROLE_NAVIGATION : ''}
        >
          thoughts
        </div>
      )
    case CATEGORY_TYPE.HIKE:
      return (
        <div
          onClick={() => pushProps(CATEGORY_TYPE.HIKE)}
          className={
            pushToRouter
              ? `${styles.hikeCategory} ${styles.categoryLink}`
              : styles.hikeCategory
          }
          role={pushToRouter ? ROLE_NAVIGATION : ''}
        >
          trip reports
        </div>
      )
  }
}

export default Category
