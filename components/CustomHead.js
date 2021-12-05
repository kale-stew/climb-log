import Head from 'next/head'
import { useRouter } from 'next/router'

const CustomHead = ({ title }) => {
  const router = useRouter()

  return (
    <Head>
      <script
        dangerouslySetInnerHTML={{
          __html: `
          window.dataLayer = window.dataLayer || [];
          dataLayer.push({
            'event': 'Pageview',
            'pagePath': 'https://www.kylies.photos${router.asPath}',
            'pageTitle': '${title}',
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
      <title>{title}</title>
      <script async src="https://www.googletagmanager.com/gtag/js?id=G-W9WRKKHEN8" />

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
    </Head>
  )
}

export default CustomHead
