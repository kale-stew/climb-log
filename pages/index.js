import Head from 'next/head'
import LanderFull from '../public/photos/lander.jpg'
import LanderMobile from '../public/photos/lander_mobile.jpg'
import Layout from '../components/Layout'
import ResponsiveImage from '../components/ResponsiveImage'
import { METADATA } from '../utils/constants'

const HomePage = () => (
  <Layout home>
    <Head>
      <title>{METADATA.SITE_NAME} | Photography, Hiking</title>
    </Head>
    <br />
    <ResponsiveImage
      altTxt="Looking through fall colors towards Capitol Peak in Aspen, Colorado."
      desktopImg={LanderFull}
      desktopDimensions={{ width: '5000', height: '3333' }}
      mobileImg={LanderMobile}
      mobileDimensions={{ width: '2000', height: '1450' }}
    />
  </Layout>
)

export default HomePage
