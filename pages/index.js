import Layout from '../components/Layout'
import Link from 'next/link'
import PostPreview from '../components/PostPreview'
import styled from '@emotion/styled'
import { METADATA, PREVIEW_CARD_COLORS, PREVIEW_IMAGES } from '../utils/constants'
import { getRecentPosts } from '../utils/data/posts'
import { socialImage } from '../utils/social-image'

import styles from '../components/Layout.module.css'
import utilStyles from '../styles/utils.module.css'

const GradientTopImage = styled.div`
  background-image: linear-gradient(transparent, var(--color-bg-primary)),
    url('/photos/lander_top.jpg');
  height: 30vh;
  width: 100%;
  background-size: cover;
  @media (max-width: 1024px) {
    max-height: 25vh;
  }
`

const GradientBottomImage = styled.div`
  background-image: linear-gradient(var(--color-bg-primary), transparent),
    url('/photos/lander_bottom.jpg');
  height: 25vh;
  width: 100%;
  background-size: cover;
  margin-top: 5vh;
`

const IntroParagraph = styled.div`
  font-size: 1.3rem;
  font-style: italic;
  max-width: 40%;
  margin: 1rem auto 3rem auto;
  text-align: center;
  @media (max-width: 1024px) {
    max-width: 90%;
    font-size: 1.5rem;
  }
`

const HomePage = ({ featuredPosts }) => (
  <Layout home>
    <GradientTopImage />
    <IntroParagraph>
      {METADATA.FIRST_NAME} is an avid hiker, web developer, mountaineer, and photo-taker
      that spends her time hiking Colorado's high peaks and researching its terrain. Read
      more about her <Link href="/about">here</Link>.
    </IntroParagraph>
    <h1 className={`${utilStyles.heading2Xl} ${utilStyles.centerText}`}>Recent Posts</h1>
    <div className={styles.recentPosts}>
      {featuredPosts.map((post) => (
        <PostPreview postData={post} key={post.id} />
      ))}
    </div>
    <GradientBottomImage />
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
        bgColor: PREVIEW_CARD_COLORS.green,
      })),
    },
  }
}

export default HomePage
