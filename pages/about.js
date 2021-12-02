import Head from 'next/head'
import Layout from '../components/Layout'

import utilStyles from '../styles/utils.module.css'

const AboutPage = () => (
  <Layout>
    <Head>
      <title>About Kylie Stewart</title>
    </Head>
    <h1 className={utilStyles.headingXl}>More about Kylie Stewart</h1>
  </Layout>
)

export default AboutPage
