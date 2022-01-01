import Card from '../components/Card'
import Layout from '../components/Layout'
import ResponsiveImage from '../components/ResponsiveImage'
import { METADATA } from '../utils/constants'
import { getMostRecentPosts } from '../utils/posts'
import { socialImage } from '../utils/social-image'

// Photos
import LanderTop from '../public/photos/lander_top.png'
import LanderBottom from '../public/photos/lander_bottom.png'
import MobileLanderTop from '../public/photos/Mlander_top.png'
import MobileLanderBottom from '../public/photos/Mlander_bottom.png'

import styles from '../components/Layout.module.css'
import utilStyles from '../styles/utils.module.css'

const baseName = 'home'

const HomePage = ({ featuredPosts }) => (
  <Layout home>
    <ResponsiveImage
      altTxt="Looking through fall colors towards Capitol Peak in Aspen, Colorado."
      desktopImg={LanderTop}
      desktopDimensions={{ width: 2100, height: 824 }}
      mobileImg={MobileLanderTop}
      mobileDimensions={{ width: 1200, height: 550 }}
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
      desktopDimensions={{ width: 2100, height: 888 }}
      mobileImg={MobileLanderBottom}
      mobileDimensions={{ width: 1200, height: 611 }}
    />
  </Layout>
)

export async function getStaticProps() {
  const featuredPosts = await getMostRecentPosts()
  const title = `Colorado Hiking & Photography`
  const description = `${METADATA.NAME} is climbing the high peaks of Colorado.`

  return {
    props: {
      baseName,
      description,
      featuredPosts,
      title,
      ...(await socialImage({ title, description, baseName })),
    },
  }
}

export default HomePage
