import Image from 'next/image'
import CustomHead from '../components/CustomHead'
import Layout from '../components/Layout'
import CapitolCreek from '../public/photos/2021_capitol-creek.jpg'

import styles from '../components/Layout.module.css'

const HomePage = () => (
  <Layout home>
    <CustomHead title={'Kylie Stewart | Photography, Hiking'} />
    <br />
    <Image
      src={CapitolCreek}
      alt="Looking through fall colors towards Capitol Peak in Aspen, Colorado."
      layout="intrinsic"
      placeholder="blur"
    ></Image>
  </Layout>
)

export default HomePage
