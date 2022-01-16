import Category from '../components/Category'
import FormattedDate from '../components/Date'
import Layout from '../components/Layout'
import Link from 'next/link'
import styled from '@emotion/styled'
import { CATEGORY_TYPE, PREVIEW_CARD_COLORS, METADATA } from '../utils/constants'
import { getSortedPostsData } from '../utils/data/posts'
import { socialImage } from '../utils/social-image'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'

import styles from '../styles/blog.module.css'
import utilStyles from '../styles/utils.module.css'

const CATEGORY_COLORS = {
  'text-tertiary': CATEGORY_TYPE.ALL,
  orange: CATEGORY_TYPE.GEAR,
  pink: CATEGORY_TYPE.THOUGHTS,
  purple: CATEGORY_TYPE.HIKE,
}

const BlogCategoryFilterButton = styled.button`
  background-color: ${(p) =>
    p.isSelected
      ? `var(--color-${Object.keys(CATEGORY_COLORS).find(
          (key) => CATEGORY_COLORS[key] === p.name
        )})`
      : 'var(--color-bg-tertiary);'};
  color: ${(p) =>
    p.name === CATEGORY_TYPE.ALL && p.isSelected
      ? 'var(--color-bg-primary)'
      : 'var(--color-white)'};
  font-weight: 400;
  font-size: 13px;
  &:hover {
    background-color: ${(p) =>
      `var(--color-${Object.keys(CATEGORY_COLORS).find(
        (key) => CATEGORY_COLORS[key] === p.name
      )})`};
    color: ${(p) =>
      p.name === CATEGORY_TYPE.ALL ? 'var(--color-bg-primary)' : 'var(--color-white)'};
  }
  @media (max-width: 650px) {
    font-size: 12px;
  }
`

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
    Object.entries(CATEGORY_TYPE).map(([key, value]) => (
      <BlogCategoryFilterButton
        key={key}
        name={value}
        isSelected={viewCategory === CATEGORY_TYPE[key]}
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
      </BlogCategoryFilterButton>
    ))

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

        <section className={`${utilStyles.headingMd} ${styles.blogSection}`}>
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
        bgColor: PREVIEW_CARD_COLORS.yellow,
        textColor: PREVIEW_CARD_COLORS.navy,
      })),
    },
  }
}
