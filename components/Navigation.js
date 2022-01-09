import Image from 'next/image'
import Link from 'next/link'
// import Logo from './Logo'
import LogoImage from '../public/logo512.png'

import styles from './Navigation.module.css'

export const Navigation = () => (
  <header className={styles.navigation}>
    <Link href="/blog">Blog</Link>
    <Link href="/climb-log">Climb Log</Link>
    <Link href="/about">About</Link>
  </header>
)

export const LandingNavigation = () => (
  <div className={styles.landingHeader}>
    <div className={styles.landingLogoWrapper}>
      <Image src={LogoImage} />
    </div>
    <div className={styles.landingNavigation}>
      <Link href="/blog">Blog</Link>
      <Link href="/climb-log">Climb Log</Link>
      <Link href="/about">About</Link>
    </div>
  </div>
)
