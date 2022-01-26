import ContactForm from '../components/ContactForm'
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
        desktopDimensions={{ width: 240, height: 330 }}
        mobileImg={HeadshotMobile}
        mobileCn={`${utilStyles.roundImage} ${styles.aboutImage}`}
        mobileDimensions={{ width: 175, height: 175 }}
      />

      <div className={styles.aboutBlockText}>
        <p>
          {METADATA.FULL_NAME} is a web developer, avid hiker, mountaineer and
          photo-taker. She spends her time hiking Colorado's high peaks and researching
          its terrain when she's not working from home or walking the dog with her fiancé.
        </p>
        <p>
          Living in a small mountain town in the Colorado Rockies, {METADATA.FIRST_NAME}{' '}
          spends a lot of her down time taking photos with her Sony Alpha 6400 and
          traveling to nearby peaks to test out her longer range lenses.
        </p>
        <p>
          Although she is taking the first 3 months of 2022 off of hiking to recover from
          ankle surgery, she's eager to make the most of this time off by testing out her
          camera's features from handicap-accessible lots and 4WD trails across the state.
        </p>

        <br />
        <h2>Brands</h2>
        <div>
          <p
            className={utilStyles.centerTextForMobile}
            style={{ fontStyle: 'italic', fontSize: '14px' }}
          >
            {METADATA.FIRST_NAME} is an ambassador for...
          </p>
          <ul style={{ paddingLeft: '1em' }}>
            {BRANDS.map((brand) => (
              <li key={brand.name}>
                <a href={brand.href}>
                  <strong>{brand.name}</strong>
                </a>
                {brand.description && `: ${brand.description}`}
              </li>
            ))}
          </ul>
        </div>

        <br />
        <h2 className={utilStyles.centerTextForMobile}>📬 Get in Touch</h2>
        <p className={styles.formCaption}>
          To stay up to date with {METADATA.FIRST_NAME}'s climbs, follow her{' '}
          <a href="https://www.instagram.com/kalestews/">on Instagram</a>. To see some of
          her other projects, visit her <a href="https://kylieis.online">personal site</a>
          . To discuss working together, or to just say hi, use the following form:
        </p>
        <ContactForm />
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
