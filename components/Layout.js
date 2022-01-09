import { useEffect, useState } from 'react'
import Footer from './Footer'
import { LandingNavigation, Navigation } from './Navigation'
import Link from 'next/link'
import Loading from './Loading'
import { useRouter } from 'next/router'

import styles from './Layout.module.css'
import utilStyles from '../styles/utils.module.css'

export default function Layout({ children, home }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const isLoading = (url = '') => setLoading(true)
    const isntLoading = (url = '') => setLoading(false)
    router.events.on('routeChangeStart', isLoading)
    router.events.on('routeChangeComplete', isntLoading)
    return () => {
      router.events.off('routeChangeStart', isLoading)
      router.events.off('routeChangeComplete', isntLoading)
    }
  }, [router.events])

  return (
    <>
      <div className={!home ? styles.wrapper : styles.landingPage}>
        {home ? <LandingNavigation /> : <Navigation />}
        <main>{!loading ? children : <Loading />}</main>
        {!home && (
          <div className={utilStyles.backToHome}>
            <Link href="/">
              <a>📍🏠</a>
            </Link>
          </div>
        )}
      </div>
      <Footer />
    </>
  )
}
