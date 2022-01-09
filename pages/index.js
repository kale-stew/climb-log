import Card from '../components/Card'
import Layout from '../components/Layout'
import { COLORS, METADATA, PREVIEW_IMAGES } from '../utils/constants'
import { getRecentPosts } from '../utils/data/posts'
import { socialImage } from '../utils/social-image'

import styles from '../components/Layout.module.css'
import utilStyles from '../styles/utils.module.css'

const HomePage = ({ featuredPosts }) => (
  <Layout home>
    <div className={utilStyles.gradientTop} />
    <h1 className={`${utilStyles.heading2Xl} ${utilStyles.centerText}`}>Recent Posts</h1>
    <div className={styles.recentPosts}>
      {featuredPosts.map((post) => (
        <Card postData={post} key={post.id} />
      ))}
    </div>
    <div className={utilStyles.gradientBottom} />
  </Layout>
)

export async function getStaticProps() {
  const featuredPosts = await getRecentPosts()
  const title = `${METADATA.FIRST_NAME}'s Climbing Log and Hiking Blog`
  const description = `${METADATA.FULL_NAME}'s photography, climbing log, and hiking blog.`

  return {
    props: {
      title,
      description,
      featuredPosts,
      ...(await socialImage({
        title,
        description,
        baseName: 'home',
        previewImgUrl: PREVIEW_IMAGES.HOME_IMAGE,
        bgColor: COLORS.green,
      })),
    },
  }
}

export default HomePage
