import Link from 'next/link'
import { METADATA } from '../utils/constants'

import styles from './Navigation.module.css'

export const Navigation = () => (
  <header className={styles.navigation}>
    <Link href="/blog">Blog</Link>
    <Link href="/climb-log">Climb Log</Link>
    <Link href="/about">About</Link>
  </header>
)

export const LandingHeader = () => (
  <div className={styles.landingHeader}>
    <h1>{METADATA.NAME.toUpperCase()}</h1>
    <div className={styles.landingNavigation}>
      <Link href="/blog">Blog</Link>
      <Link href="/climb-log">Climb Log</Link>
      <Link href="/about">About</Link>
    </div>
  </div>
)
