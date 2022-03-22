import { useRouter } from 'next/router'
import { CATEGORY_TYPE } from '../utils/constants'
import styled from '@emotion/styled'

import styles from './Category.module.css'

const ROLE_NAVIGATION = 'navigation'

export const CATEGORY_COLORS = {
  'text-tertiary': CATEGORY_TYPE.ALL,
  orange: CATEGORY_TYPE.GEAR,
  pink: CATEGORY_TYPE.THOUGHTS,
  purple: CATEGORY_TYPE.HIKE,
}

const CategoryButton = styled.button`
  color: var(--color-white);
  border-radius: 1em;
  margin: auto 0 auto 1vw;
  padding: 0.2em 0.6em;
  line-height: 1.3em;
  font-size: 0.8rem;
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

  return (
    <CategoryButton
      onClick={() => pushProps(category)}
      className={pushToRouter ? styles.categoryLink : ''}
      role={pushToRouter ? ROLE_NAVIGATION : ''}
      color={Object.keys(CATEGORY_COLORS).find(
        (key) => CATEGORY_COLORS[key] === category
      )}
    >
      {category === 'hike' ? 'trip reports' : category}
    </CategoryButton>
  )
}

export default Category
