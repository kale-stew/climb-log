import Layout from '../components/Layout'
import Link from 'next/link'
import PostPreview from '../components/PostPreview'
import styled from '@emotion/styled'
import { METADATA, PREVIEW_CARD_COLORS, PREVIEW_IMAGES } from '../utils/constants'
import { fadeIn } from '../styles/animations'
import { getRecentPosts } from '../utils/data/posts'
import { socialImage } from '../utils/social-image'

import styles from '../components/Layout.module.css'
import utilStyles from '../styles/utils.module.css'

const GradientTopImage = styled.div`
  background-image: linear-gradient(transparent, var(--color-bg-primary)),
    url('/photos/desktop_lander_T.jpg');
  height: 30vh;
  width: 100%;
  background-size: cover;
  @media (max-width: 1024px) {
    max-height: 25vh;
  }
`

const GradientBottomImage = styled.div`
  background-image: linear-gradient(var(--color-bg-primary), transparent),
    url('/photos/desktop_lander_B.jpg');
  height: 25vh;
  width: 100%;
  background-size: cover;
  margin-top: 5vh;
`

const IntroParagraph = styled.div`
  font-size: 1.3rem;
  max-width: 40%;
  margin: 1rem auto 4.5rem auto;
  text-align: center;
  animation: ${fadeIn} 3s;
  @media (max-width: 1024px) {
    max-width: 80%;
    font-size: 1.2rem;
  }
`

const IntroTitle = styled.h1`
  font-size: 4rem;
  font-style: italic;
  animation: ${fadeIn} 3s;
  @media (max-width: 1024px) {
    font-size: 3.5rem;
    margin: 0 auto;
  }
`

const HomePage = ({ featuredPosts }) => (
  <Layout home>
    <GradientTopImage />
    <div style={{ fontFamily: "'Playfair Display', serif" }}>
      <IntroTitle className={`${utilStyles.heading2Xl} ${utilStyles.centerText}`}>
        {METADATA.FIRST_NAME}'s Photos
      </IntroTitle>
      <IntroParagraph>
        {METADATA.FIRST_NAME} is an avid hiker, web developer, mountaineer, and
        photo-taker that spends her time hiking Colorado's high peaks and researching its
        terrain. Read more about her <Link href="/about">here</Link>.
      </IntroParagraph>
    </div>
    <h2 className={`${utilStyles.headingXl} ${utilStyles.centerText}`}>Recent Posts</h2>
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
        bgColor: PREVIEW_CARD_COLORS.blue,
      })),
    },
  }
}

export default HomePage
