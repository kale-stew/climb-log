import Head from 'next/head'
import Layout from '../components/Layout'
import ResponsiveImage from '../components/ResponsiveImage'
import { METADATA } from '../utils/constants'

// Photos
import LanderTop from '../public/photos/lander_top.png'
import LanderBottom from '../public/photos/lander_bottom.png'
import MobileLanderTop from '../public/photos/Mlander_top.png'
import MobileLanderBottom from '../public/photos/Mlander_bottom.png'

const HomePage = () => (
  <Layout home>
    <Head>
      <title>{METADATA.SITE_NAME} | Photography, Hiking</title>
    </Head>
    <br />
    <ResponsiveImage
      altTxt="Looking through fall colors towards Capitol Peak in Aspen, Colorado."
      desktopImg={LanderTop}
      desktopDimensions={{ width: '2100', height: '824' }}
      mobileImg={MobileLanderTop}
      mobileDimensions={{ width: '1200', height: '550' }}
    />
    <h1>I'm over here</h1>
    <ResponsiveImage
      altTxt="Looking through fall colors towards Capitol Peak in Aspen, Colorado."
      desktopImg={LanderBottom}
      desktopDimensions={{ width: '2100', height: '888' }}
      mobileImg={MobileLanderBottom}
      mobileDimensions={{ width: '1200', height: '611' }}
    />
  </Layout>
)

export default HomePage
