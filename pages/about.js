import HeadshotFull from '../public/photos/headshot.jpg'
import HeadshotMobile from '../public/photos/square_headshot.jpg'
import Layout from '../components/Layout'
import ResponsiveImage from '../components/ResponsiveImage'
import { BRANDS, METADATA, PREVIEW_IMAGES } from '../utils/constants'
import { socialImage } from '../utils/social-image'

import styles from '../styles/about.module.css'
import utilStyles from '../styles/utils.module.css'

const AboutPage = () => (
  <Layout>
    <h1 className={`${utilStyles.headingXl} ${utilStyles.centerText}`}>
      About {METADATA.FIRST_NAME}
    </h1>
    <br />
    <div className={styles.aboutBlock}>
      <ResponsiveImage
        altTxt={`A photo of the author, ${METADATA.FULL_NAME}`}
        desktopImg={HeadshotFull}
        wrapperCn={styles.aboutImage}
        desktopDimensions={{ width: 300, height: 412 }}
        mobileImg={HeadshotMobile}
        mobileCn={`${utilStyles.roundImage} ${styles.aboutImage}`}
        mobileDimensions={{ width: 175, height: 175 }}
      />

      <div className={styles.aboutBlockText}>
        <p>
          {METADATA.FULL_NAME} is a web developer, avid hiker, amateur mountaineer and
          photo-taker. She spends her time hiking Colorado's high peaks and researching
          its terrain when she's not working from home alongside her fiancé or walking
          their dog, Otis, around the local alpine lake.
        </p>
        <p>
          As an aspiring photographer, Kylie spends a good amount of time testing out what
          she's learned in the mountains. Living in a small mountain town in the Colorado
          Rockies, it's usually easy to find something worth taking a photo of.
        </p>
        <p>
          Although she is taking the first 6 months of 2022 off of hiking to recover from
          ankle surgery, she's eager to make the most of this time off by testing out her
          camera's features from handicap-accessible lots across the state.
        </p>
        <p>
          To stay up to date with Kylie's climbs, follow her{' '}
          <a href="https://www.instagram.com/kalestews/">on Instagram</a>. If you want to
          check out some of Kylie's other projects, visit her{' '}
          <a href="https://kylieis.online">personal site</a>. To discuss working together,
          send her{' '}
          <a href="mailto:kylie@hey.com" network="email">
            an email
          </a>{' '}
          .
        </p>

        <br />
        <h2>Brands</h2>
        <div>
          <p className={styles.brandSummary}>Kylie is an ambassador for...</p>
          <ul>
            {BRANDS.map((brand) => (
              <li key={brand.name}>
                <a className={styles.brandLink} href={brand.href}>
                  {brand.name}
                </a>
                {brand.description && `: ${brand.description}`}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  </Layout>
)

export async function getStaticProps() {
  const title = `About ${METADATA.FULL_NAME}`
  const description = 'Photographer, hiker, and web developer.'

  return {
    props: {
      title,
      description,
      ...(await socialImage({
        title,
        description,
        previewImgUrl: PREVIEW_IMAGES.ABOUT_IMAGE,
        baseName: 'about',
        bgColor: '#993e41',
      })),
    },
  }
}

export default AboutPage
