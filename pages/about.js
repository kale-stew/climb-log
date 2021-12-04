import Head from 'next/head'
import Headshot from '../public/photos/headshot.jpg'
import Image from 'next/image'
import Layout from '../components/Layout'
import { FaGithub, FaFlickr, FaInstagram, FaLinkedinIn, FaTwitter } from 'react-icons/fa'
import { MdOutlineMail } from 'react-icons/md'
import { SocialLinks } from '../utils/socials'

import utilStyles from '../styles/utils.module.css'

const AboutPage = () => (
  <Layout>
    <Head>
      <title>About Kylie Stewart</title>
      <script
          async
          src="https://www.googletagmanager.com/gtag/js?id=G-W9WRKKHEN8"
        />

        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-W9WRKKHEN8', { page_path: window.location.pathname });
            `,
          }}
        />
    </Head>
    <h1 className={utilStyles.headingXl}>More about Kylie Stewart</h1>
    <br />
    <div className={utilStyles.aboutBlock}>
      <Image src={Headshot} height={1200} width={905} layout="intrinsic" />
      <div className={`${utilStyles.vertical} ${utilStyles.aboutBlockText}`}>
        <p>
          Kylie Stewart is a web developer, avid hiker, amateur mountaineer and
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
          <a href="https://kylieis.online">website</a>.
        </p>
      </div>
    </div>
    <br />
    <br />
    <div className={utilStyles.socialIcons}>
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
