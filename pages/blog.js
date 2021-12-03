import React, { useState } from 'react'
import Category from '../components/Category'
import Date from '../components/Date'
import Head from 'next/head'
import Link from 'next/link'
import Layout from '../components/Layout'
import { getSortedPostsData } from '../utils/posts'
import { gearCategory, hikeCategory, thoughtsCategory } from '../utils/constants'

import utilStyles from '../styles/utils.module.css'

export default function BlogLandingPage({ allPostsData }) {
  const [viewCategory, setCategory] = useState('all')

  return (
    <Layout>
      <Head>
        <title>Kylie Stewart | Hiking Blog</title>
      </Head>
      <h1 className={utilStyles.headingXl}>Blog</h1>

      <section>
        <button
          className={
            viewCategory === 'all' ? utilStyles.categorySelected : 'categoryButton'
          }
          onClick={() => setCategory('all')}
        >
          All
        </button>
        <button
          className={
            viewCategory === gearCategory ? utilStyles.categorySelected : 'categoryButton'
          }
          onClick={() =>
            setCategory(viewCategory === gearCategory ? 'all' : gearCategory)
          }
        >
          Gear
        </button>
        <button
          className={
            viewCategory === thoughtsCategory
              ? utilStyles.categorySelected
              : 'categoryButton'
          }
          onClick={() =>
            setCategory(viewCategory === thoughtsCategory ? 'all' : thoughtsCategory)
          }
        >
          Thoughts
        </button>
        <button
          className={
            viewCategory === hikeCategory ? utilStyles.categorySelected : 'categoryButton'
          }
          onClick={() =>
            setCategory(viewCategory === hikeCategory ? 'all' : hikeCategory)
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
                  viewCategory === category || viewCategory === 'all' ? 'block' : 'none',
              }}
            >
              <Link href="/[category]/[id]" as={`/${category}/${id}`}>
                <a className={`${utilStyles.blogPostHeading}`}>{title}</a>
              </Link>
              <br />
              <small className={`${utilStyles.lightText} ${utilStyles.blogItemCategory}`}>
                <Category category={category} /> <Date dateString={date} />
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
