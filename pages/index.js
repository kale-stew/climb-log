import Head from 'next/head'
import Card from '../components/Card'
import Layout from '../components/Layout'
import ResponsiveImage from '../components/ResponsiveImage'
import { METADATA } from '../utils/constants'

// Photos
import LanderTop from '../public/photos/lander_top.png'
import LanderBottom from '../public/photos/lander_bottom.png'
import MobileLanderTop from '../public/photos/Mlander_top.png'
import MobileLanderBottom from '../public/photos/Mlander_bottom.png'

import styles from '../components/Layout.module.css'
import utilStyles from '../styles/utils.module.css'

const FAKE_FEATURES = [
  {
    title: 'Climb Fletcher Mtn',
    date: '12-02-21',
    description:
      'A bunch of information about Fletcher Mountain, it was a good climb, averaged about normal distance.',
    href: '/fletcher',
  },
  {
    title: 'Hike Missouri Mtn',
    date: '10-12-21',
    description:
      'It was a cool & dry day on Missouri with bluebird conditions. Where is the snow?',
    href: '/missouri',
  },
  {
    title: 'Packing for a 14er',
    date: '11-29-21',
    description:
      'There are lots of things to consider when packing for your first 14er...',
    href: '/14er-pack-lists',
  },
]

const HomePage = ({ featuredPosts }) => (
  <Layout home>
    <Head>
      <title>{METADATA.SITE_NAME} | Photography, Hiking</title>
    </Head>
    <br />
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
        <Card postData={post} />
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
  // const featuredPosts = getMostRecentPosts()
  return {
    props: {
      featuredPosts: FAKE_FEATURES,
    },
  }
}

export default HomePage
