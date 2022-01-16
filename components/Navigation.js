import dynamic from 'next/dynamic'
import Link from 'next/link'

import styles from './Navigation.module.css'
import utilStyles from '../styles/utils.module.css'

const ThemeToggle = dynamic(() => import('../components/ThemeToggle'), {
  ssr: false,
})

export const Navigation = ({ isHome }) => (
  <header className={isHome ? styles.landingHeader : styles.navigation}>
    <ThemeToggle />
    {isHome ? (
      <div className={styles.landingNavigation}>
        <Link href="/blog">Blog</Link>
        <Link href="/climb-log">Climb Log</Link>
        <Link href="/about">About</Link>
      </div>
    ) : (
      <div className={utilStyles.singleRow}>
        <Link href="/blog">Blog</Link>
        <Link href="/climb-log">Climb Log</Link>
        <Link href="/about">About</Link>
      </div>
    )}
  </header>
)
