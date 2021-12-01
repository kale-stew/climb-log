import React, { useState } from 'react'
import Router from 'next/router'
import Link from 'next/link'
import Loading from './Loading'

export default function Layout({ children, home }) {
  const [loading, setLoading] = useState(false)
  Router.events.on('routeChangeStart', url => setLoading(true))
  Router.events.on('routeChangeComplete', url => setLoading(false))

  return (
    <div className="wrapper">
      <header className="header">
        <Link href="/blog">Blog</Link>
        <Link href="/climb-log">Climb Log</Link>
        <Link href="/work">Work</Link>
        <Link href="/about">About</Link>
      </header>

      <main>{!loading ? children : <Loading />}</main>

      {!home && (
        <div className="backToHome">
          <Link href="/">
            <a>← Back to home</a>
          </Link>
        </div>
      )}
    </div>
  )
}
