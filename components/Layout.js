import Footer from './Footer'
import Link from 'next/link'
import Loading from './Loading'
import styled from '@emotion/styled'
import { Navigation } from './Navigation'
import { shake } from '../styles/animations'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'

import styles from './Layout.module.css'

const BackToHomeButton = styled.span`
  margin: 3rem 0;
  a {
    text-decoration: none;
  }
  &:hover {
    animation: ${shake} 0.3s;
    animation-iteration-count: infinite;
  }
`

export default function Layout({ children, home }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const isLoading = (url = '') => setLoading(true)
    const isNotLoading = (url = '') => setLoading(false)
    router.events.on('routeChangeStart', isLoading)
    router.events.on('routeChangeComplete', isNotLoading)
    return () => {
      router.events.off('routeChangeStart', isLoading)
      router.events.off('routeChangeComplete', isNotLoading)
    }
  }, [router.events])

  return (
    <>
      <div className={!home ? styles.wrapper : styles.landingPage}>
        <Navigation isHome={home} />
        <main>{!loading ? children : <Loading />}</main>
        {!home && (
          <BackToHomeButton>
            <Link href="/">📍🏠</Link>
          </BackToHomeButton>
        )}
      </div>
      <Footer />
    </>
  )
}
