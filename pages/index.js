import Head from 'next/head'
import Card from '../components/Card'
import Layout from '../components/Layout'
import ResponsiveImage from '../components/ResponsiveImage'
import { METADATA } from '../utils/constants'
import { getMostRecentPosts } from '../utils/posts'

// Photos
import LanderTop from '../public/photos/lander_top.png'
import LanderBottom from '../public/photos/lander_bottom.png'
import MobileLanderTop from '../public/photos/Mlander_top.png'
import MobileLanderBottom from '../public/photos/Mlander_bottom.png'
import { GA_TRACKING_ID } from '../utils/gtag'
import styles from '../components/Layout.module.css'
import utilStyles from '../styles/utils.module.css'

const HomePage = ({ featuredPosts }) => (
  <Layout home>
    <Head>
      {/* Global Site Tag (gtag.js) - Google Analytics */}
      <script
            async
            src={`https://www.googletagmanager.com/gtag/js?id=${GA_TRACKING_ID}`}
          />
          <script
            dangerouslySetInnerHTML={{
              __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_TRACKING_ID}', {
              page_path: window.location.pathname,
            });
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
      <title>{METADATA.SITE_NAME} | Photography, Hiking</title>
    </Head>
    <ResponsiveImage
      altTxt="Looking through fall colors towards Capitol Peak in Aspen, Colorado."
      desktopImg={LanderTop}
      desktopDimensions={{ width: '2100', height: '824' }}
      mobileImg={MobileLanderTop}
      mobileDimensions={{ width: '1200', height: '550' }}
    />
    <h1 className={`${utilStyles.heading2Xl} ${utilStyles.centerText}`}>
      Most Recent Posts
    </h1>
    <div className={styles.mostRecentPosts}>
      {featuredPosts.map((post) => (
        <Card postData={post} key={post.id} />
      ))}
    </div>
    <ResponsiveImage
      altTxt="Looking through fall colors towards Capitol Peak in Aspen, Colorado."
      desktopImg={LanderBottom}
      desktopDimensions={{ width: '2100', height: '888' }}
      mobileImg={MobileLanderBottom}
      mobileDimensions={{ width: '1200', height: '611' }}
    />
  </Layout>
)

export async function getStaticProps() {
  const featuredPosts = await getMostRecentPosts()
  return {
    props: {
      featuredPosts,
    },
  }
}

export default HomePage
