import { useState } from 'react'
import Router from 'next/router'
import Link from 'next/link'
import { LandingHeader, Navigation } from './Navigation'
import Loading from './Loading'

import styles from './Layout.module.css'
import utilStyles from '../styles/utils.module.css'

export default function Layout({ children, home }) {
  const [loading, setLoading] = useState(false)
  Router.events.on('routeChangeStart', (url) => setLoading(true))
  Router.events.on('routeChangeComplete', (url) => setLoading(false))

  return (
    <div className={!home ? `${styles.wrapper}` : `${styles.landingPage}`}>
      {home ? <LandingHeader /> : <Navigation />}
      <main>{!loading ? children : <Loading />}</main>

      {!home && (
        <div className={utilStyles.backToHome}>
          <Link href="/">
            <a>📍🏠</a>
          </Link>
        </div>
      )}
    </div>
  )
}
