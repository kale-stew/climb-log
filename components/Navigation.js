import dynamic from 'next/dynamic'
import Link from 'next/link'

import styles from './Navigation.module.css'
import utilStyles from '../styles/utils.module.css'

const ThemeToggle = dynamic(() => import('../components/ThemeToggle'), {
  ssr: false,
})

export const Navigation = () => (
  <header className={`${styles.navigation} ${utilStyles.vertical}`}>
    <ThemeToggle />
    <div className={utilStyles.singleRow}>
      <Link href="/blog">Blog</Link>
      <Link href="/climb-log">Climb Log</Link>
      <Link href="/about">About</Link>
    </div>
  </header>
)

export const LandingNavigation = () => (
  <div className={styles.landingHeader}>
    <span style={{ marginLeft: '1rem' }}>
      <ThemeToggle />
    </span>
    <div className={styles.landingNavigation}>
      <Link href="/blog">Blog</Link>
      <Link href="/climb-log">Climb Log</Link>
      <Link href="/about">About</Link>
    </div>
  </div>
)
