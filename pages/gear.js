import Layout from '../components/Layout'
import { METADATA, PREVIEW_IMAGES } from '../utils/constants'
import { fetchAllGear } from '../utils/data/gear'
import { capitalizeEachWord } from '../utils/helpers'
import { socialImage } from '../utils/social-image'

import styles from '../styles/gear.module.css'
import utilStyles from '../styles/utils.module.css'

const GearPage = ({ title, allGear }) => {
  const filterByCategory = (arr, cat) => arr.filter(({ category }) => category === cat)
  const createGearTitle = (item) =>
    capitalizeEachWord(
      `${item.brand}${item.product_str ? ` ${item.product_str} ` : ' '}${item.title}`
    )
  const getGearCategories = () => {
    const arr = allGear.map((gear) => gear.category)
    return Array.from(new Set(arr))
  }

  return (
    <Layout>
      <h1 className={utilStyles.centerText}>{title}</h1>
      <div className={styles.gearWrapper}>
        {getGearCategories().map((cat) => (
          <>
            <h3>{cat}</h3>
            <ul>
              {filterByCategory(allGear, cat).map((item) => (
                <li key={item.title}>{createGearTitle(item)}</li>
              ))}
            </ul>
          </>
        ))}
      </div>
    </Layout>
  )
}

export async function getStaticProps() {
  const allGear = await fetchAllGear()
  const title = `${METADATA.FIRST_NAME}'s Gear`
  const description = `${METADATA.FULL_NAME}: Photographer, hiker, and web developer.`

  return {
    props: {
      allGear,
      title,
      description,
      ...(await socialImage({
        title,
        description,
        previewImgUrl: PREVIEW_IMAGES.GEAR_IMAGE,
        baseName: 'gear',
        bgColor: '#d3562c',
      })),
    },
  }
}

export default GearPage
