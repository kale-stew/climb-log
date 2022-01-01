import { useRouter } from 'next/router'
import { useEffect } from 'react'
import { pageview } from '../utils/gtag'
import CustomHead from '../components/CustomHead'

import '../styles/globals.css'

export default function App({ Component, pageProps }) {
  const router = useRouter()
  useEffect(() => {
    const handleRouteChange = (url) => {
      pageview(url)
    }
    router.events.on('routeChangeComplete', handleRouteChange)
    return () => {
      router.events.off('routeChangeComplete', handleRouteChange)
    }
  }, [router.events])

  return (
    <>
      <CustomHead {...pageProps} />
      <Component {...pageProps} />
    </>
  )
}
