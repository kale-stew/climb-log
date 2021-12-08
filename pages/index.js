import Image from 'next/image'
import CustomHead from '../components/CustomHead'
import Layout from '../components/Layout'
import ImageCapitolCreek from '../public/photos/2021_capitol-creek.jpg'

const HomePage = () => (
  <Layout home>
    <CustomHead title={'Kylie Stewart | Photography, Hiking'} />
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
