import { FacebookOpenGraph } from '@resoc/core'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { METADATA } from '../utils/constants'

const CustomHead = (pageProps) => {
  const router = useRouter()
  const routeToPage = `https://${METADATA.SITE_NAME}/${
    pageProps.baseName !== 'home' ? pageProps.baseName : ''
  }`

  return (
    <Head>
      {/* Global Site Tag (gtag.js) - Google Analytics */}
      <script async src={`https://www.googletagmanager.com/gtag/js?id=G-W9WRKKHEN8`} />
      <script
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            dataLayer.push({
              'event': 'Pageview',
              'pagePath': 'https://www.kylies.photos${router.asPath}',
              'pageTitle': '${pageProps.title}',
              'visitorType': 'HARD CODED VISITOR'
            })
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
      <script
        dangerouslySetInnerHTML={{
          __html: `
            <!-- Global site tag (gtag.js) - Google Analytics -->
              
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-W9WRKKHEN8', { page_path: window.location.pathname });
          `,
        }}
      />

      <meta property="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content="@kyliestew" />
      <meta name="twitter:title" content={pageProps.title} />
      <meta name="twitter:description" content={pageProps.description} />
      <meta
        property="twitter:image"
        content={`https://raw.githubusercontent.com/kale-stew/climb-log/main/public/open-graph/${pageProps.ogImage}`}
      />

      <meta property="og:image" content={`/open-graph/${pageProps.ogImage}`} />
      <meta property="og:image:width" content={FacebookOpenGraph.width} />
      <meta property="og:image:height" content={FacebookOpenGraph.height} />
      <meta property="og:type" content="website" />
      <meta property="og:url" content={routeToPage} />

      <meta property="og:title" content={pageProps.title} />
      <title>{`${pageProps.title} · ${METADATA.SITE_NAME}`}</title>
      <meta
        property="og:description"
        content={
          pageProps.description
            ? pageProps.description
            : `${METADATA.FULL_NAME}'s photography, climbing log, and hiking blog.`
        }
      />
      <meta
        name="description"
        content={
          pageProps.description
            ? pageProps.description
            : `${METADATA.FULL_NAME}'s photography, climbing log, and hiking blog.`
        }
      />
    </Head>
  )
}

export default CustomHead
