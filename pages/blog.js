import Category from '../components/Category'
import FormattedDate from '../components/Date'
import Layout from '../components/Layout'
import Link from 'next/link'
import { CATEGORY_TYPE, COLORS, METADATA } from '../utils/constants'
import { getSortedPostsData } from '../utils/data/posts'
import { socialImage } from '../utils/social-image'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'

import styles from '../styles/blog.module.css'
import utilStyles from '../styles/utils.module.css'

export default function BlogLandingPage({ allPostsData }) {
  const [viewCategory, setCategory] = useState(CATEGORY_TYPE.ALL)
  const router = useRouter()
  const queryPayload = router.query

  useEffect(() => {
    const checkQuery = () => {
      if (Object.keys(queryPayload).length > 0) {
        setCategory(Object.keys(queryPayload)[0])
      }
    }
    checkQuery()
    return () => checkQuery
  }, [queryPayload])

  const buildCategories = () =>
    Object.entries(CATEGORY_TYPE).map(([key, value]) => {
      return (
        <button
          key={key}
          className={
            viewCategory === CATEGORY_TYPE[key]
              ? styles.filterSelected
              : styles.filterButton
          }
          onClick={() =>
            key == CATEGORY_TYPE.ALL
              ? router.push({ pathname: '/blog' }) && setCategory(CATEGORY_TYPE.ALL)
              : setCategory(
                  viewCategory === CATEGORY_TYPE[key]
                    ? CATEGORY_TYPE.ALL
                    : CATEGORY_TYPE[key]
                )
          }
        >
          {value === CATEGORY_TYPE.HIKE ? 'trip reports' : value}
        </button>
      )
    })

  return (
    <Layout>
      <div className={styles.blogPage}>
        <div className={styles.blogHeaders}>
          <h1 className={utilStyles.headingXl}>Blog</h1>
          <section
            className={utilStyles.centerTextForMobile}
            style={{ marginBottom: '1.25rem' }}
          >
            {buildCategories()}
          </section>
        </div>

        <section
          className={`${utilStyles.headingMd} ${utilStyles.padding1px} ${styles.blogSection}`}
        >
          <ul className={utilStyles.list}>
            {allPostsData.map(({ id, category, date, preview, title }) => (
              <li
                className={utilStyles.listItem}
                key={id}
                style={{
                  display:
                    viewCategory === category || viewCategory === CATEGORY_TYPE.ALL
                      ? 'block'
                      : 'none',
                }}
              >
                <Link href="/[category]/[id]" as={`/${category}/${id}`}>
                  <a className={styles.blogPostHeading}>{title}</a>
                </Link>
                <br />
                <small className={`${utilStyles.lightText} ${utilStyles.singleRow}`}>
                  <FormattedDate dateString={date} />{' '}
                  <Category category={category} pushToRouter={false} />
                </small>
                <small className={utilStyles.listItem}>{preview}</small>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </Layout>
  )
}

export async function getStaticProps() {
  const allPostsData = getSortedPostsData()
  const title = `${METADATA.FIRST_NAME}'s Hiking Blog`
  const description = 'Thoughts, trip reports, and gear posts.'

  return {
    props: {
      allPostsData,
      description,
      title,
      ...(await socialImage({
        title,
        description,
        baseName: 'blog',
        bgColor: COLORS.yellow,
        textColor: COLORS.navy,
      })),
    },
  }
}
