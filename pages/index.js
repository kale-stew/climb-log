import Head from 'next/head'
import Image from 'next/image'
import Layout from '../components/Layout'
import CapitolCreek from '../public/photos/2021_capitol-creek.jpg'

import styles from '../components/Layout.module.css'

// use `home` var in Layout to custom target this screen
// add a parallax image? rotate through a selection?
// preview of blog posts, up to 3 for now

const HomePage = () => (
  <Layout home>
    <Head>
      <title>Kylie Stewart | Photography, Hiking</title>
    </Head>
    <Image
      src={CapitolCreek}
      className={styles.landingImage}
      layout="fill"
      placeholder="blur"
    ></Image>
  </Layout>
)

export default HomePage
