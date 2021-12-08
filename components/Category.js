import { CATEGORY_TYPE } from '../utils/constants'
import utilStyles from '../styles/utils.module.css'
import { useRouter } from 'next/router'

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
          className={pushToRouter ? `${utilStyles.gearCategory} ${utilStyles.categoryLink}` : utilStyles.gearCategory}
          role={pushToRouter ? 'navigation' : ''}
        >
          gear
        </div>
      )
    case CATEGORY_TYPE.THOUGHTS:
      return (
        <div
          onClick={() => pushProps(CATEGORY_TYPE.THOUGHTS)}
          className={pushToRouter ? `${utilStyles.thoughtsCategory} ${utilStyles.categoryLink}` : utilStyles.thoughtsCategory}
          role={pushToRouter ? 'navigation' : ''}
        >
          thoughts
        </div>
      )
    case CATEGORY_TYPE.HIKE:
      return (
        <div
          onClick={() => pushProps(CATEGORY_TYPE.HIKE)}
          className={pushToRouter ? `${utilStyles.hikeCategory} ${utilStyles.categoryLink}` : utilStyles.hikeCategory}
          role={pushToRouter ? 'navigation' : ''}
        >
          trip reports
        </div>
      )
  }
}

export default Category
