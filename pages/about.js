import ContactForm from '../components/ContactForm'
import Gallery from 'react-grid-gallery'
import HeadshotFull from '../public/photos/headshot.jpg'
import HeadshotMobile from '../public/photos/square_headshot.jpg'
import Image from 'next/image'
import Layout from '../components/Layout'
import { AboutWrapper, FormCaption } from '../components/AboutPage.components'
import { METADATA, PREVIEW_IMAGES } from '../utils/constants'
import { fetchPersonalInformation } from '../utils/data/about'
import { socialImage } from '../utils/social-image'

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
              width={240}
              height={330}
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
          {METADATA.FULL_NAME} is a mountaineer, web developer, avid hiker, and
          photo-taker. She spends her time hiking Colorado's high peaks and researching
          its terrain when she's not working from home as web developer, or walking the
          dog with her husband.
        </p>
        <p>
          Living in a small mountain town in the Colorado Rockies, {METADATA.FIRST_NAME}{' '}
          spends a lot of her free time traveling to nearby peaks and taking photos with
          her Sony Alpha 6400.
        </p>
        <p>
          Although she is taking the first few months of 2022 off of hiking to recover
          from ankle surgery, she's eager to make the most of this time off by testing out
          her camera's features from trailhead lots and 4WD roads across the state.
        </p>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
            margin: '2rem auto',
          }}
        >
          <Gallery
            images={personalInfo.photos}
            backdropClosesModal={true}
            enableImageSelection={false}
          />
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

        <div style={{ width: '100%', margin: '2rem auto' }}>
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
