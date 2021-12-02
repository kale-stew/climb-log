import Head from 'next/head'
import Layout from '../components/Layout'

import utilStyles from '../styles/utils.module.css'

const PortfolioPage = () => (
  <Layout>
    <Head>
      <title>Kylie Stewart | Photography Portfolio</title>
    </Head>
    <h1 className={utilStyles.headingXl}>More about Kylie Stewart's Work</h1>
  </Layout>
)

export default PortfolioPage
