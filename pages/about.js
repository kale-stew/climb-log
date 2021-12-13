import Head from 'next/head'
import HeadshotFull from '../public/photos/headshot.jpg'
import HeadshotMobile from '../public/photos/square_headshot.jpg'
import Layout from '../components/Layout'
import ResponsiveImage from '../components/ResponsiveImage'
import { FaGithub, FaFlickr, FaInstagram, FaLinkedinIn, FaTwitter } from 'react-icons/fa'
import { MdOutlineMail } from 'react-icons/md'
import { BRANDS, LINKS_URL, METADATA } from '../utils/constants'

import styles from '../styles/about.module.css'
import utilStyles from '../styles/utils.module.css'

const AboutPage = ({ socialLinks }) => (
  <Layout>
    <Head>
      <title>About {METADATA.NAME}</title>
    </Head>
    <h1 className={`${utilStyles.headingXl} ${utilStyles.centerText}`}>
      More about {METADATA.NAME}
    </h1>
    <br />
    <div className={styles.aboutBlock}>
      <ResponsiveImage
        altTxt={`A photo of the author, ${METADATA.NAME}`}
        desktopImg={HeadshotFull}
        wrapperCn={styles.aboutImage}
        desktopDimensions={{ width: '300', height: '412' }}
        mobileImg={HeadshotMobile}
        mobileCn={`${utilStyles.roundImage} ${styles.aboutImage}`}
        mobileDimensions={{ width: '250', height: '250' }}
      />

      <div className={styles.aboutBlockText}>
        <p>
          {METADATA.NAME} is a web developer, avid hiker, amateur mountaineer and
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
          To see some of Kylie's other projects, check out her{' '}
          <a href={socialLinks.PersonalHomepage}>personal site</a>.
        </p>

        <br />
        <h2>Brands</h2>
        <p>
          Kylie is an ambassador for...
          <ul>
            {BRANDS.map((brand) => (
              <li>
                <a className={styles.brandLink} href={brand.href}>
                  {brand.name}
                </a>
                {brand.description && `: ${brand.description}`}
              </li>
            ))}
          </ul>
        </p>
      </div>
    </div>
    <br />
    <br />
    <div className={styles.socialIcons}>
      <a target="_blank" href={socialLinks.PersonalEmail} network="email">
        <MdOutlineMail />
      </a>
      <a target="_blank" href={socialLinks.Twitter}>
        <FaTwitter />
      </a>
      <a target="_blank" href={socialLinks.Flickr}>
        <FaFlickr />
      </a>
      <a target="_blank" href={socialLinks.LinkedIn}>
        <FaLinkedinIn />
      </a>
      <a target="_blank" href={socialLinks.Instagram}>
        <FaInstagram />
      </a>
      <a target="_blank" href={socialLinks.Github}>
        <FaGithub />
      </a>
    </div>
  </Layout>
)

export async function getStaticProps() {
  const result = await fetch(LINKS_URL)
  const links = await result.json()
  return {
    props: {
      socialLinks: links[0],
    },
  }
}

export default AboutPage
