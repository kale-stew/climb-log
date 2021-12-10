import HeadshotFull from '../public/photos/headshot.jpg'
import HeadshotMobile from '../public/photos/square_headshot.jpg'
import Layout from '../components/Layout'
import ResponsiveImage from '../components/ResponsiveImage'
import { FaGithub, FaFlickr, FaInstagram, FaLinkedinIn, FaTwitter } from 'react-icons/fa'
import { MdOutlineMail } from 'react-icons/md'
import { METADATA, SocialLinks } from '../utils/constants'

import styles from '../styles/about.module.css'
import utilStyles from '../styles/utils.module.css'
import CustomHead from '../components/CustomHead'

const AboutPage = () => (
  <Layout>
    <CustomHead title={`About ${METADATA.NAME}`} />
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
          photo-taker. When she's not hanging out at home with her fiancé and dog, you can
          find her hiking Colorado's high peaks or researching her next climb.
        </p>
        <p>
          As an aspiring photographer, Kylie spends a good amount of time testing out what
          she's learned in the mountains. Living in the scenic Colorado Rockies, it's easy
          to find something worth taking a photo of.
        </p>
        <p>
          To see some of Kylie's other work, check out her{' '}
          <a href={SocialLinks.Homepage}>website</a>.
        </p>
      </div>
    </div>
    <br />
    <br />
    <div className={styles.socialIcons}>
      <a target="_blank" href={SocialLinks.Email} network="email">
        <MdOutlineMail />
      </a>
      <a target="_blank" href={SocialLinks.Twitter}>
        <FaTwitter />
      </a>
      <a target="_blank" href={SocialLinks.Flickr}>
        <FaFlickr />
      </a>
      <a target="_blank" href={SocialLinks.LinkedIn}>
        <FaLinkedinIn />
      </a>
      <a target="_blank" href={SocialLinks.Instagram}>
        <FaInstagram />
      </a>
      <a target="_blank" href={SocialLinks.Github}>
        <FaGithub />
      </a>
    </div>
  </Layout>
)

export default AboutPage
