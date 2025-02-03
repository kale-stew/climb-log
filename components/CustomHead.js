// import { FacebookOpenGraph } from '@resoc/core'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { METADATA } from '../utils/constants'

const CustomHead = (pageProps) => {
  const router = useRouter()
  const getPageTitle = () =>
    pageProps.baseName && pageProps.baseName === 'home'
      ? pageProps.title
      : `${pageProps.title} · ${METADATA.SITE_NAME}`

  const getPageUrl = () => {
    if (!pageProps.baseName) {
      return `https://${METADATA.SITE_NAME}`
    } else if (pageProps.baseName.indexOf('post-') === 0) {
      return `https://${METADATA.SITE_NAME}/${pageProps.postData.category}/${pageProps.postData.id}`
    } else if (pageProps.baseName === 'home') {
      return `https://${METADATA.SITE_NAME}`
    } else if (pageProps.baseName === 'photos') {
      return `https://${METADATA.SITE_NAME}/all`
    }

    return `https://${METADATA.SITE_NAME}/${pageProps.baseName}`
  }

  const description = pageProps.description
    ? pageProps.description
    : `${METADATA.FULL_NAME}'s climbing log, hiking blog, and photography.`

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
              'pagePath': 'https://www.${METADATA.SITE_NAME}${router.asPath}',
              'pageTitle': "${pageProps.title}",
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
      <meta name="twitter:site" content={`@${METADATA.TWITTER_HANDLE}`} />
      <meta name="twitter:title" content={pageProps.title} />
      <meta name="twitter:description" content={pageProps.description} />
      <meta
        property="twitter:image"
        content={`https://raw.githubusercontent.com/kale-stew/climb-log/main/public/open-graph/${pageProps.ogImage}`}
      />

      <meta property="og:image" content={`/open-graph/${pageProps.ogImage}`} />
      {/* <meta property="og:image:width" content={FacebookOpenGraph.width} />
      <meta property="og:image:height" content={FacebookOpenGraph.height} /> */}
      <meta property="og:type" content="website" />
      <meta property="og:url" content={getPageUrl()} />

      <meta property="og:title" content={pageProps.title} />
      <title>{getPageTitle()}</title>
      <meta property="og:description" content={description} />
      <meta name="description" content={description} />
    </Head>
  )
}

export default CustomHead
