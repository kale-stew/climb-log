import dynamic from 'next/dynamic'
import Link from 'next/link'
import Logo from './Logo'
import { FiExternalLink } from 'react-icons/fi'
import {
  CONNECT as connectLinks,
  EXPLORE as exploreLinks,
  METADATA,
  REFERRALS as referralLinks,
} from '../utils/constants'

import styles from './Footer.module.css'

const ThemeToggle = dynamic(() => import('../components/ThemeToggle'), {
  ssr: false,
})

export default function Footer() {
  const buildExternalLink = ({ title, href }) => (
    <div className={styles.externalLink} key={`url-${title}`}>
      <a target="_blank" href={href}>
        {title} <FiExternalLink />
      </a>
    </div>
  )

  return (
    <footer>
      <div className={styles.footerLinks}>
        <div className={styles.footerColumn}>
          <h3>Explore</h3>
          <hr className={styles.footerDivider}></hr>
          {exploreLinks.map((item) => (
            <Link href={item.href} key={`url-${item.title}`}>
              {item.title}
            </Link>
          ))}
          <ThemeToggle />
        </div>

        <div className={styles.footerColumn}>
          <h3>Connect</h3>
          <hr className={styles.footerDivider}></hr>
          {connectLinks.map((item) => buildExternalLink(item))}
        </div>

        <div className={styles.footerColumn}>
          <h3>Affiliate Links</h3>
          <hr className={styles.footerDivider}></hr>
          {referralLinks.map((item) => buildExternalLink(item))}
        </div>

        <div className={styles.footerLogo}>
          <Logo theme="dark" />
          <small>
            © {new Date().getFullYear()} {METADATA.FULL_NAME}
          </small>
        </div>
      </div>
    </footer>
  )
}
