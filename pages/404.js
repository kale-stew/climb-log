import Head from 'next/head'
import Image from 'next/image'
import Layout from '../components/Layout'
import ImageGoats from '../public/photos/404.jpeg'

import utilStyles from '../styles/utils.module.css'
import GA_TRACKING_ID from '../utils/gtag'
const NotFoundPage = () => (
  <Layout>
    <Head>
      {/* Global Site Tag (gtag.js) - Google Analytics */}
      <script
            async
            src={`https://www.googletagmanager.com/gtag/js?id=${GA_TRACKING_ID}`}
          />
          <script
            dangerouslySetInnerHTML={{
              __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_TRACKING_ID}', {
              page_path: window.location.pathname,
            });
          `,
            }}
          />
      <title>Page Not Found | kylies.photos</title>
    </Head>
    <br />
    <h1>Well this is awkward...</h1>
    <Image src={ImageGoats} />
    <div className={utilStyles.vertical}>
      <h2>You've found a page that does not exist.</h2>
      <p>Click the home icon below ↓ to navigate back home</p>
    </div>
  </Layout>
)

export default NotFoundPage
