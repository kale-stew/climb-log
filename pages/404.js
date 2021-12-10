import Head from 'next/head'
import Image from 'next/image'
import Layout from '../components/Layout'
import ImageGoats from '../public/photos/404.jpeg'

import utilStyles from '../styles/utils.module.css'

const NotFoundPage = () => (
  <Layout>
    <Head>
      {/* Global Site Tag (gtag.js) - Google Analytics */}
      <script
            async
            src={`https://www.googletagmanager.com/gtag/js?id=G-W9WRKKHEN8`}
          />
          <script
            dangerouslySetInnerHTML={{
              __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-W9WRKKHEN8', {
              page_path: window.location.pathname,
            });
          `,
            }}
          />
          <script
        dangerouslySetInnerHTML={{
          __html: `
      <!-- Google Tag Manager -->
      (function(w, d, s, l, i) {
        w[l] = w[l] || []
        w[l].push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' })
        var f = d.getElementsByTagName(s)[0],
          j = d.createElement(s),
          dl = l != 'dataLayer' ? '&l=' + l : ''
        j.async = true
        j.src = 'https://www.googletagmanager.com/gtm.js?id=' + i + dl
        f.parentNode.insertBefore(j, f)
      })(window, document, 'script', 'dataLayer', 'GTM-5VZPGSC')
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
