import { useRouter } from 'next/router'
import { useEffect } from 'react'
import '../styles/globals.css'

export default function App({ Component, pageProps }) {
  const router = useRouter()

  const handleRouteChange = (url) => {
    window.gtag('config', 'G-W9WRKKHEN8', {
      page_path: url,
    })
  }

  useEffect(() => {
    router.events.on('routeChangeComplete', handleRouteChange)
    return () => {
      router.events.off('routeChangeComplete', handleRouteChange)
    }
  }, [router.events])
  return <Component {...pageProps} />
}
