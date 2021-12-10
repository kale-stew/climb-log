import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import Link from 'next/link'
import Category from '../components/Category'
import FormattedDate from '../components/Date'
import Layout from '../components/Layout'
import { CATEGORY_TYPE, METADATA } from '../utils/constants'
import { getSortedPostsData } from '../utils/posts'

import categoryStyles from '../components/Category.module.css'
import styles from '../styles/blog.module.css'
import utilStyles from '../styles/utils.module.css'

export default function BlogLandingPage({ allPostsData }) {
  const [viewCategory, setCategory] = useState(CATEGORY_TYPE.ALL)
  const router = useRouter()

  useEffect(() => {
    const queryPayload = router.query
    if (Object.keys(queryPayload).length > 0) {
      setCategory(Object.keys(queryPayload)[0])
    }
  }, [])

  return (
    <Layout>
      <Head>
        {/* Global Site Tag (gtag.js) - Google Analytics */}
        <script
            async
            src={`https://www.googletagmanager.com/gtag/js?id=G-W9WRKKHEN8`}
          />
          <script
        dangerouslySetInnerHTML={{
          __html: `
          window.dataLayer = window.dataLayer || [];
          dataLayer.push({
            'event': 'Pageview',
            'pagePath': 'https://www.kylies.photos${router.asPath}',
            'pageTitle': '${title}',
            'visitorType': 'HARD CODED VISITOR'
          })
          `,
        }}
      />
          <script
        dangerouslySetInnerHTML={{
          __html: `
      <!-- Google Tag Manager -->
      (function(w, d, s, l, i) {
        w[l] = w[l] || []
        w[l].push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' })
        var f = d.getElementsByTagName(s)[0],
          j = d.createElement(s),
          dl = l != 'dataLayer' ? '&l=' + l : ''
        j.async = true
        j.src = 'https://www.googletagmanager.com/gtm.js?id=' + i + dl
        f.parentNode.insertBefore(j, f)
      })(window, document, 'script', 'dataLayer', 'GTM-5VZPGSC')
      `,
        }}
      />
<script
        dangerouslySetInnerHTML={{
          __html: `
          <!-- Global site tag (gtag.js) - Google Analytics -->
            
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-W9WRKKHEN8', { page_path: window.location.pathname });
          `,
        }}
      />
        <title>{METADATA.SITE_NAME} | Hiking Blog</title>
      </Head>
      <h1 className={utilStyles.headingXl}>Blog</h1>

      <section>
        <button
          className={
            viewCategory === CATEGORY_TYPE.ALL
              ? categoryStyles.categorySelected
              : 'categoryButton'
          }
          onClick={() => {
            router.push({ pathname: '/blog' })
            setCategory(CATEGORY_TYPE.ALL)
          }}
        >
          All
        </button>
        <button
          className={
            viewCategory === CATEGORY_TYPE.GEAR
              ? categoryStyles.categorySelected
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
              ? categoryStyles.categorySelected
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
              ? categoryStyles.categorySelected
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
                <a className={`${styles.blogPostHeading}`}>{title}</a>
              </Link>
              <br />
              <small className={`${utilStyles.lightText} ${styles.blogItemCategory}`}>
                <FormattedDate dateString={date} />{' '}
                <Category category={category} pushToRouter={false} />
              </small>
              <small className={utilStyles.listItem}>{preview}</small>
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
