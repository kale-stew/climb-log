import Head from 'next/head'
import Image from 'next/image'
import Layout from '../components/Layout'
import ImageCapitolCreek from '../public/photos/2021_capitol-creek.jpg'

const HomePage = () => (
  <Layout home>
    <Head>
      <title>Kylie Stewart | Photography, Hiking</title>
    </Head>
    <br />
    <Image
      src={ImageCapitolCreek}
      alt="Looking through fall colors towards Capitol Peak in Aspen, Colorado."
      layout="intrinsic"
      placeholder="blur"
    ></Image>
  </Layout>
)

export default HomePage
