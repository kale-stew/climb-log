import { useState } from 'react'
import Footer from './Footer'
import { LandingNavigation, Navigation } from './Navigation'
import Link from 'next/link'
import Loading from './Loading'
import Router from 'next/router'

import styles from './Layout.module.css'
import utilStyles from '../styles/utils.module.css'

export default function Layout({ children, home }) {
  const [loading, setLoading] = useState(false)
  Router.events.on('routeChangeStart', (url) => setLoading(true))
  Router.events.on('routeChangeComplete', (url) => setLoading(false))

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

      {!home && <Footer />}
    </>
  )
}
