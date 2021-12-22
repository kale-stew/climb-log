import Link from 'next/link'
import Image from 'next/image'
import LogoImg from '../public/logo.png'

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
    <div className={styles.landingLogoWrapper}>
      <Image src={LogoImg} layout="intrinsic" />
    </div>
    <div className={styles.landingNavigation}>
      <Link href="/blog">Blog</Link>
      <Link href="/climb-log">Climb Log</Link>
      <Link href="/about">About</Link>
    </div>
  </div>
)
