import { useRouter } from 'next/router'
import { CATEGORY_TYPE, ROLE_NAVIGATION } from '../utils/constants'
import styled from '@emotion/styled'

import styles from './Category.module.css'

const CategoryButton = styled.button`
  color: var(--color-white);
  border-radius: 1em;
  margin: auto 0 auto 1vw;
  padding: 0.2em 0.6em;
  line-height: 1.3em;
  font-size: 12px;
  font-weight: 600;
  opacity: 0.8;
  background-color: ${(p) => `var(--color-${p.color})`};
`

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
        <CategoryButton
          onClick={() => pushProps(CATEGORY_TYPE.GEAR)}
          className={pushToRouter ? styles.categoryLink : ''}
          role={pushToRouter ? ROLE_NAVIGATION : ''}
          color="orange"
        >
          gear
        </CategoryButton>
      )
    case CATEGORY_TYPE.THOUGHTS:
      return (
        <CategoryButton
          onClick={() => pushProps(CATEGORY_TYPE.THOUGHTS)}
          className={pushToRouter ? styles.categoryLink : ''}
          role={pushToRouter ? ROLE_NAVIGATION : ''}
          color="pink"
        >
          thoughts
        </CategoryButton>
      )
    case CATEGORY_TYPE.HIKE:
      return (
        <CategoryButton
          onClick={() => pushProps(CATEGORY_TYPE.HIKE)}
          className={pushToRouter ? styles.categoryLink : ''}
          role={pushToRouter ? ROLE_NAVIGATION : ''}
          color="purple"
        >
          trip reports
        </CategoryButton>
      )
  }
}

export default Category
