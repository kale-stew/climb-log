import Layout from '../components/Layout'
import { METADATA, PREVIEW_IMAGES } from '../utils/constants'
import { fetchAllGear } from '../utils/data/gear'
import { capitalizeEachWord } from '../utils/helpers'
import { socialImage } from '../utils/social-image'

import styles from '../styles/gear.module.css'
import utilStyles from '../styles/utils.module.css'
import { useEffect, useState } from 'react'

const GearPage = ({ title, allGear }) => {
  const [gearCategories, setGearCategories] = useState()
  const [pureGear, setPure] = useState()
  const [gearData, setGearData] = useState()

  const buildCategories = (gearList = pureGear, setState = false) => {
    const arr = gearList.map((gear) => gear.category)
    const returnArray = Array.from(new Set(arr))

    if (setState) {
      setGearCategories(returnArray)
    }
    return returnArray
  }

  const userSearch = (query) => {
    const upperQuery = query.toUpperCase().trim()
    if (upperQuery == '') {
      buildCategories(pureGear, true)
      setGearData(pureGear)
      return
    }
    let filteredGear = pureGear.filter((gear) => {
      let booleanVal =
        gear.title?.toUpperCase().includes(upperQuery) ||
        gear.category?.toUpperCase().includes(upperQuery) ||
        gear.brand?.toUpperCase().includes(upperQuery) ||
        gear.product_str?.toUpperCase().includes(upperQuery)
      return booleanVal
    })
    buildCategories(filteredGear, true)
    setGearData(filteredGear)
  }

  useEffect(() => {
    setPure(allGear)
    setGearData(allGear)
    buildCategories(allGear, true)
  }, [])

  const filterByCategory = (arr, cat) => arr.filter(({ category }) => category === cat)
  const createGearTitle = (item) =>
    capitalizeEachWord(
      `${item.brand}${item.product_str ? ` ${item.product_str} ` : ' '}${item.title}`
    )

  return (
    <Layout>
      <h1 className={utilStyles.centerText}>{title}</h1>
      <div>
        <input
          // className={styles.searchInput} TODO STYLES
          type={'search'}
          placeholder="Try 'Helmet' or 'Backpacking'"
          onChange={(e) => {
            userSearch(e.target.value)
          }}
        />
      </div>
      <div className={styles.gearWrapper}>
        {gearCategories &&
          gearCategories.map((cat) => (
            <>
              <h3 key={`h3-${cat}`}>{cat}</h3>
              <ul key={`ul-${cat}`}>
                {filterByCategory(gearData, cat).map((item) => (
                  <li key={`${cat}-${item.id}`}>{createGearTitle(item)}</li>
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
