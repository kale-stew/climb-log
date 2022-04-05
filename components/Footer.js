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
import utilStyles from '../styles/utils.module.css'

export default function Footer() {
  const buildExternalLink = ({ title, href }) => (
    <span key={`external-${title}`}>
      <a className={utilStyles.singleRow} target="_blank" href={href}>
        {title} <FiExternalLink style={{ marginLeft: '0.5ch' }} />
      </a>
    </span>
  )

  return (
    <footer>
      <div className={styles.footerLinks}>
        <div className={utilStyles.vertical}>
          <h3>Explore</h3>
          <hr className={styles.footerDivider}></hr>
          {exploreLinks.map((item) => (
            <Link href={item.href} key={`url-${item.title}`}>
              {item.title}
            </Link>
          ))}
        </div>

        <div className={utilStyles.vertical}>
          <h3>Connect</h3>
          <hr className={styles.footerDivider}></hr>
          {connectLinks.map((item) => buildExternalLink(item))}
        </div>

        <div className={utilStyles.vertical}>
          <h3>Affiliate Links</h3>
          <hr className={styles.footerDivider}></hr>
          {referralLinks.map((item) => buildExternalLink(item))}
        </div>

        <div className={`${utilStyles.vertical} ${styles.footerLogo}`}>
          <Logo theme="dark" />
          <small>
            © {new Date().getFullYear()}{' '}
            <a href={METADATA.PERSONAL_SITE} target="_blank">
              {METADATA.FULL_NAME}
            </a>
          </small>
          <small style={{ fontSize: '10px', textAlign: 'center' }}>
            built with ♡{' '}
            <a href={METADATA.SOURCE_CODE} target="_blank">
              on github
            </a>
          </small>
        </div>
      </div>
    </footer>
  )
}
