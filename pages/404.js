import Image from 'next/image'
import CustomHead from '../components/CustomHead'
import Layout from '../components/Layout'
import ImageGoats from '../public/photos/404.jpeg'
import { METADATA } from '../utils/constants'

import utilStyles from '../styles/utils.module.css'

const NotFoundPage = () => {
  return (
    <Layout>
      <CustomHead title={`Page Not Found | ${METADATA.SITE_NAME}`} />
      <br />
      <h1>Well this is awkward...</h1>
      <Image src={ImageGoats} />
      <div className={utilStyles.vertical}>
        <h2>You've found a page that does not exist.</h2>
        <p>Click the home icon below ↓ to navigate back home</p>
      </div>
    </Layout>
  )
}

export default NotFoundPage
