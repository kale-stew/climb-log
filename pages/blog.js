import { useState } from 'react'
import Category from '../components/Category'
import FormattedDate from '../components/Date'
import Head from 'next/head'
import Link from 'next/link'
import Layout from '../components/Layout'
import { getSortedPostsData } from '../utils/posts'
import { CATEGORY_TYPE } from '../utils/constants'

import utilStyles from '../styles/utils.module.css'

export default function BlogLandingPage({ allPostsData }) {
  const [viewCategory, setCategory] = useState(CATEGORY_TYPE.ALL)

  return (
    <Layout>
      <Head>
        <title>Kylie Stewart | Hiking Blog</title>
      </Head>
      <h1 className={utilStyles.headingXl}>Blog</h1>

      <section>
        <button
          className={
            viewCategory === CATEGORY_TYPE.ALL
              ? utilStyles.categorySelected
              : 'categoryButton'
          }
          onClick={() => setCategory(CATEGORY_TYPE.ALL)}
        >
          All
        </button>
        <button
          className={
            viewCategory === CATEGORY_TYPE.GEAR
              ? utilStyles.categorySelected
              : 'categoryButton'
          }
          onClick={() =>
            setCategory(
              viewCategory === CATEGORY_TYPE.GEAR ? CATEGORY_TYPE.ALL : CATEGORY_TYPE.GEAR
            )
          }
        >
          Gear
        </button>
        <button
          className={
            viewCategory === CATEGORY_TYPE.THOUGHTS
              ? utilStyles.categorySelected
              : 'categoryButton'
          }
          onClick={() =>
            setCategory(
              viewCategory === CATEGORY_TYPE.THOUGHTS
                ? CATEGORY_TYPE.ALL
                : CATEGORY_TYPE.THOUGHTS
            )
          }
        >
          Thoughts
        </button>
        <button
          className={
            viewCategory === CATEGORY_TYPE.HIKE
              ? utilStyles.categorySelected
              : 'categoryButton'
          }
          onClick={() =>
            setCategory(
              viewCategory === CATEGORY_TYPE.HIKE ? CATEGORY_TYPE.ALL : CATEGORY_TYPE.HIKE
            )
          }
        >
          Trip Reports
        </button>
      </section>

      <section className={`${utilStyles.headingMd} ${utilStyles.padding1px}`}>
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
                <a className={`${utilStyles.blogPostHeading}`}>{title}</a>
              </Link>
              <br />
              <small className={`${utilStyles.lightText} ${utilStyles.blogItemCategory}`}>
                <FormattedDate dateString={date} /> <Category category={category} />
              </small>
              <small className={utilStyles.listItem}>{preview}...</small>
            </li>
          ))}
        </ul>
      </section>
    </Layout>
  )
}

export async function getStaticProps() {
  const allPostsData = getSortedPostsData()
  return {
    props: {
      allPostsData,
    },
  }
}
