import Link from 'next/link'
import dynamic from 'next/dynamic'
import styled from '@emotion/styled'
import { IoEllipsisVertical, IoCloseCircleOutline } from 'react-icons/io5'
import { useRouter } from 'next/router'
import { useState } from 'react'
import {
  DESKTOP_NAV as desktopNavLinks,
  MOBILE_NAV as mobileNavLinks,
} from '../utils/constants'

import styles from './Navigation.module.css'
import utilStyles from '../styles/utils.module.css'

const ThemeToggle = dynamic(() => import('../components/ThemeToggle'), {
  ssr: false,
})

const MenuToggleButton = styled.button`
  display: none;
  margin: 0;
  &:hover {
    color: var(--color-text-accent);
  }
  @media (max-width: 1024px) {
    display: block;
    background: transparent;
    cursor: pointer;
  }
`

const ExpandedNavigation = styled.div`
  z-index: 200;
  width: 15vw;
  height: min-content;
  margin: auto 0 auto auto;
  padding: 2vh 2vw;
  display: flex;
  flex-direction: column;
  border-radius: 5px;
  gap: 1rem;
  -webkit-transform: translate3d(0, 0, 0);
  @media (max-width: 1024px) {
    height: max-content;
    gap: 1;
  }
  @media (max-width: 700px) {
    margin: 0 0 auto auto;
    width: 45vw;
    padding: 1rem;
    font-size: 18px;
    line-height: 1;
  }
  a:hover {
    text-decoration: underline;
  }
`

const SelectedRoute = styled.span`
  font-weight: 600;
`

export const Navigation = ({ isHome }) => {
  const [showMenu, toggleShowMenu] = useState(false)
  const router = useRouter()
  const currentRoute = router.asPath

  return (
    <header className={isHome ? styles.landingHeader : styles.navigation}>
      <ThemeToggle />
      <div className={isHome ? styles.landingNavigation : utilStyles.singleRow}>
        {showMenu ? (
          <ExpandedNavigation>
            <MenuToggleButton
              onClick={() => toggleShowMenu(!showMenu)}
              style={{ textAlign: 'right' }}
            >
              <IoCloseCircleOutline size="1.5rem" />
            </MenuToggleButton>
            {!isHome && <Link href="/">Home</Link>}
            {mobileNavLinks.map(({ href, name }) => (
              <Link href={`/${href}`}>
                {currentRoute.includes(href) ? (
                  <SelectedRoute>{name}</SelectedRoute>
                ) : (
                  name
                )}
              </Link>
            ))}
          </ExpandedNavigation>
        ) : (
          <>
            <div className={utilStyles.hiddenForMobile}>
              {!isHome && <Link href="/">Home</Link>}
              {desktopNavLinks.map(({ href, name }) => (
                <Link href={`/${href}`}>
                  {currentRoute.includes(href) ? (
                    <SelectedRoute>{name}</SelectedRoute>
                  ) : (
                    name
                  )}
                </Link>
              ))}
            </div>
            <MenuToggleButton onClick={() => toggleShowMenu(!showMenu)}>
              <IoEllipsisVertical size="1.5rem" />
            </MenuToggleButton>
          </>
        )}
      </div>
    </header>
  )
}
