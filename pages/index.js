import Head from 'next/head'
import Image from 'next/image'
import ImageCapitolCreek from '../public/photos/2021_capitol-creek.jpg'
import Layout from '../components/Layout'
import { METADATA } from '../utils/constants'

const HomePage = () => (
  <Layout home>
    <Head>
      <title>{METADATA.SITE_NAME} | Photography, Hiking</title>
    </Head>
    <br />
    <Image
      src={ImageCapitolCreek}
      alt="Looking through fall colors towards Capitol Peak in Aspen, Colorado."
      className="landingImage"
      layout="intrinsic"
      placeholder="blur"
    ></Image>
  </Layout>
)

export default HomePage
