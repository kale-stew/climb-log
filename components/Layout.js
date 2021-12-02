import React, { useState } from 'react'
import Router from 'next/router'
import Link from 'next/link'
import Loading from './Loading'

import styles from './Layout.module.css'
import utilStyles from '../styles/utils.module.css'

const Navigation = () => (
  <header className={styles.navigation}>
    <Link href="/blog">Blog</Link>
    <Link href="/climb-log">Climb Log</Link>
    <Link href="/work">Work</Link>
    <Link href="/about">About</Link>
  </header>
)

const LandingHeader = () => (
  <div className={styles.landingHeader}>
    <h1>KYLIE STEWART</h1>
    <div className={styles.landingNavigation}>
      <Link href="/blog">Blog</Link>
      <Link href="/climb-log">Climb Log</Link>
      <Link href="/work">Work</Link>
      <Link href="/about">About</Link>
    </div>
  </div>
)

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
