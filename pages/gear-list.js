import Layout from '../components/Layout'
import ToggleItem from '../components/ToggleItem'
import { METADATA, PREVIEW_IMAGES } from '../utils/constants'
import { capitalizeEachWord } from '../utils/helpers'
import { fetchAllGear } from '../utils/data/gear'
import { socialImage } from '../utils/social-image'
import { useEffect, useState } from 'react'

import styles from '../styles/gear.module.css'
import utilStyles from '../styles/utils.module.css'

const GearPage = ({ title, allGear }) => {
  const [gearCategories, setGearCategories] = useState()
  const [gearData, setGearData] = useState()

  const buildCategories = (gearList = gearData, setState = false) => {
    let hasRetiredItems = false
    const arr = gearList.map((gear) => {
      if (gear.category == '🪦 Retired Items') {
        hasRetiredItems = true
        return
      }
      return gear.category
    })

    if (hasRetiredItems) {
      arr.push('🪦 Retired Items')
    }
    const returnArray = Array.from(new Set(arr))
    if (setState) {
      setGearCategories(returnArray)
    }

    return returnArray
  }

  const userSearch = (query) => {
    const upperQuery = query.toUpperCase().trim()
    if (upperQuery == '') {
      buildCategories(gearData, true)
      setGearData(allGear)
      return
    }
    let filteredGear = gearData.filter((gear) => {
      let booleanVal =
        gear.title?.toUpperCase().includes(upperQuery) ||
        gear.brand?.toUpperCase().includes(upperQuery) ||
        gear.color?.toUpperCase().includes(upperQuery) ||
        gear.more_info?.toUpperCase().includes(upperQuery) ||
        gear.img?.toUpperCase().includes(upperQuery) ||
        gear.product_str?.toUpperCase().includes(upperQuery)
      return booleanVal
    })
    buildCategories(filteredGear, true)
    setGearData(filteredGear)
  }

  useEffect(() => {
    setGearData(allGear)
    buildCategories(allGear, true)
  }, [])

  const filterByCategory = (arr, cat) => arr.filter(({ category }) => category === cat)

  const createGearTitle = (item) =>
    capitalizeEachWord(
      `${item.brand}${item.product_str ? ` ${item.product_str} ` : ' '}${item.title}`
    )

  const buildGearList = (gearDataCategories) => {
    if (!gearDataCategories || gearDataCategories.length == 0) {
      return <p>No gear data found.</p>
    }

    return gearDataCategories.map((cat) => (
      <>
        <h3 className={utilStyles.centerTextForMobile}>{cat}</h3>
        <ul key={`ul-${cat}`}>
          {filterByCategory(gearData, cat).map((item) => (
            <ToggleItem key={`${cat}-${item.id}`} item={item}>
              {createGearTitle(item)}
            </ToggleItem>
          ))}
        </ul>
      </>
    ))
  }

  return (
    <Layout>
      <h1 className={`${utilStyles.centerText} ${utilStyles.headingXl}`}>{title}</h1>
      <div className={`${utilStyles.centerText} ${utilStyles.pageDescription}`}>
        All of {METADATA.FIRST_NAME}'s hiking, climbing, and camping gear. Items are
        sorted by descending date acquired, with the most recently gained items at the top
        of each sub-section. Gear that has been retired is at the very bottom of this
        page.
      </div>
      <div className={`${utilStyles.centerText} ${utilStyles.pageDescription}`}>
        Click on an item to view details like brand name, color, a preview image, or why
        it was retired.
      </div>
      <div className={utilStyles.vertical}>
        <p className={styles.filterTitle}>Search all gear:</p>
        <input
          className={utilStyles.searchInput}
          type={'search'}
          placeholder="Try 'tent' or 'orange'"
          onChange={(e) => {
            userSearch(e.target.value)
          }}
        />
      </div>
      <div className={styles.gearWrapper}>{buildGearList(gearCategories)} </div>
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
        baseName: 'gear-list',
        bgColor: '#d3562c',
      })),
    },
  }
}

export default GearPage
