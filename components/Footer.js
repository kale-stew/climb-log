import Link from 'next/link'
import Logo from './Logo'
import { FiExternalLink } from 'react-icons/fi'
import {
  CONNECT as connectLinks,
  EXPLORE as exploreLinks,
  REFERRALS as referralLinks,
} from '../utils/constants'

import styles from './Footer.module.css'

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
          <small>© 2022 Kylie Stewart</small>
        </div>
      </div>
    </footer>
  )
}
