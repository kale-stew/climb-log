import ContactForm from '../components/ContactForm'
import { Gallery } from 'react-grid-gallery'
import HeadshotFull from '../public/photos/headshot.jpg'
import HeadshotMobile from '../public/photos/square_headshot.jpg'
import Image from 'next/image'
import Layout from '../components/Layout'
import { AboutWrapper, FormCaption } from '../components/AboutPage.components'
import { METADATA /*, PREVIEW_IMAGES */ } from '../utils/constants'
import { fetchPersonalInformation } from '../utils/data/about'
// import { socialImage } from '../utils/social-image'
import styles from '../styles/about.module.css'

import utilStyles from '../styles/utils.module.css'

const aboutImageStyles = {
  paddingRight: '1rem',
  float: 'left',
}

const AboutPage = ({ personalInfo, title }) => {
  const altText = `A photo of the author, ${METADATA.FULL_NAME}`
  return (
    <Layout>
      <h1 className={`${utilStyles.headingXl} ${utilStyles.centerText}`}>{title}</h1>
      <AboutWrapper>
        <>
          <div className={utilStyles.hiddenForMobile} style={aboutImageStyles}>
            <Image
              src={HeadshotFull}
              width={180}
              height={247}
              layout="intrinsic"
              altTxt={altText}
            />
          </div>
          <div className={utilStyles.shownForMobile}>
            <Image
              className={utilStyles.roundImage}
              style={aboutImageStyles}
              src={HeadshotMobile}
              width={175}
              height={175}
              layout="intrinsic"
              altTxt={altText}
            />
          </div>
        </>
        <p>
          {METADATA.FULL_NAME} is a mountaineer, software engineer, avid hiker, and
          photo-taker. When she's not at work, she spends her time hiking near her home
          in California, researching the terrain of high peaks all over the country, and
          walking her dog, Otis, with her husband.
        </p>
        <p>
          Living just south of San Francisco, {METADATA.FIRST_NAME} spends much of her
          free time traveling to destinations all over the state and taking photos with
          her Sony Alpha 6400.
        </p>

        <div
          className={styles.galleryWrapper}
        >
          <Gallery
            images={personalInfo.photos}
            backdropClosesModal={true}
            enableImageSelection={false}
          />
        </div>
        <h2 className={utilStyles.centerTextForMobile}>Interviews</h2>
        <div>
          <p
            className={utilStyles.centerTextForMobile}
            style={{ fontStyle: 'italic', fontSize: '0.9rem' }}
          >
            {METADATA.FIRST_NAME} has appeared as a guest on...
          </p>
          <ul style={{ paddingLeft: '1em' }}>
            {personalInfo.interviews.map((interview) => (
              <li key={interview.name}>
                <a href={interview.brandHref}>
                  <strong>{interview.name}</strong>
                </a>
                {interview.description && `: ${interview.description}`}
                <iframe
                  style={{ borderRadius: '12px', marginTop: '1rem' }}
                  src={`${interview.embedHref}?utm_source=generator&theme=0`}
                  width="100%"
                  height="80"
                  frameBorder="0"
                  allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                ></iframe>
              </li>
            ))}
          </ul>
        </div>

        <h2 className={utilStyles.centerTextForMobile}>Brands</h2>
        <div>
          <p
            className={utilStyles.centerTextForMobile}
            style={{ fontStyle: 'italic', fontSize: '0.9rem' }}
          >
            {METADATA.FIRST_NAME} is an ambassador for...
          </p>
          <ul style={{ paddingLeft: '1em' }}>
            {personalInfo.brands.map((brand) => (
              <li key={brand.name}>
                <a href={brand.href}>
                  <strong>{brand.name}</strong>
                </a>
                {brand.description && `: ${brand.description}`}
              </li>
            ))}
          </ul>
        </div>

        <div style={{ width: '100%', margin: '1rem auto' }}>
          <h2 className={utilStyles.centerTextForMobile}>📬 Get in Touch</h2>
          <FormCaption>
            To stay up to date with {METADATA.FIRST_NAME}'s climbs, follow her{' '}
            <a href={`https://www.instagram.com/${METADATA.INSTAGRAM_HANDLE}/`}>
              on Instagram
            </a>
            . To see some of her other projects, visit her{' '}
            <a href={METADATA.PERSONAL_SITE}>personal site</a>. To discuss working
            together, or to just say hi, use the following form:
          </FormCaption>
          <ContactForm />
        </div>
      </AboutWrapper>
    </Layout>
  )
}

export async function getStaticProps() {
  const title = `About ${METADATA.FULL_NAME}`
  const description = 'Photographer, hiker, and web developer.'
  const personalInfo = fetchPersonalInformation()

  return {
    props: {
      title,
      description,
      personalInfo,
      // ...(await socialImage({
      //   title,
      //   description,
      //   previewImgUrl: PREVIEW_IMAGES.ABOUT_IMAGE,
      //   baseName: 'about',
      //   bgColor: '#993e41',
      // })),
    },
  }
}

export default AboutPage
