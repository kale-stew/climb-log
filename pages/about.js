import Head from 'next/head'
import Image from 'next/image'
import Layout from '../components/Layout'
import { FaGithub, FaFlickr, FaInstagram, FaLinkedinIn, FaTwitter } from 'react-icons/fa'
import { MdOutlineMail } from 'react-icons/md'
import { METADATA, SocialLinks } from '../utils/constants'

import HeadshotMobile from '../public/photos/square_headshot.jpg'
import HeadshotFull from '../public/photos/headshot.jpg'

import styles from '../styles/about.module.css'
import utilStyles from '../styles/utils.module.css'

const AboutPage = () => (
  <Layout>
    <Head>
      <title>About {METADATA.NAME}</title>
    </Head>
    <h1 className={`${utilStyles.headingXl} ${utilStyles.centerText}`}>
      More about {METADATA.NAME}
    </h1>
    <br />
    <div className={styles.aboutBlock}>
      <div className={styles.aboutHeadshotFullWrapper}>
        <Image src={HeadshotFull} width={300} height={412} layout="intrinsic" />
      </div>
      <div className={styles.aboutHeadshotMobileWrapper}>
        <Image
          className={utilStyles.roundImage}
          src={HeadshotMobile}
          width={250}
          height={250}
          layout="intrinsic"
        />
      </div>
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
