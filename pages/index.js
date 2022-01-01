import Card from '../components/Card'
import Layout from '../components/Layout'
import ResponsiveImage from '../components/ResponsiveImage'
import { METADATA } from '../utils/constants'
import { getRecentPosts } from '../utils/posts'
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

    <h1 className={`${utilStyles.heading2Xl} ${utilStyles.centerText}`}>Recent Posts</h1>
    <div className={styles.recentPosts}>
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
  const featuredPosts = await getRecentPosts()
  const title = `${METADATA.FIRST_NAME}'s Climbing Log and Hiking Blog`
  const description = `${METADATA.FULL_NAME}'s photography, climbing log, and hiking blog.`

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
