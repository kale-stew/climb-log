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

import utilStyles from '../styles/utils.module.css'

const ThemeToggle = dynamic(() => import('../components/ThemeToggle'), {
  ssr: false,
})

const LinkWrapper = styled.div`
  a {
    color: var(--color-text-primary);
    margin: 0 0.25em;
  }
  @media (min-width: 1024px) {
    a:last-child {
      margin: 0;
    }
  }
`

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
  width: 200px;
  height: min-content;
  display: flex;
  flex-direction: column;
  border-radius: 5px;
  line-height: 1;
  padding: 0 1rem;
  margin: auto 0 auto auto;
  @media (max-width: 1024px) {
    height: max-content;
    gap: 1;
  }
  @media (max-width: 700px) {
    margin: 0 0 auto auto;
    font-size: 1.2rem;
  }
  a:hover {
    text-decoration: underline;
  }
`

const SelectedRoute = styled.span`
  font-weight: 600;
  font-size: 1.1rem;
  padding: 0.6rem 0.2rem;
`

export const Navigation = ({ isHome }) => {
  const [showMenu, toggleShowMenu] = useState(false)
  const router = useRouter()
  const currentRoute = router.asPath

  const isCurrentRoute = (url, current) => {
    const urlArr = current.split('/')
    const categoryMatch = ['hike', 'thoughts', 'gear'].map(
      (category) => urlArr[1] === category
    )
    const containsBlogCategory = categoryMatch.filter((val) => val === true).length

    if (current.includes(url) && !containsBlogCategory) {
      return true
    } else if (containsBlogCategory) {
      return url === 'blog' ? true : false
    }

    return false
  }

  return (
    <header style={isHome && { fontFamily: "'Playfair Display', serif" }}>
      <ThemeToggle />
      <LinkWrapper>
        {showMenu ? (
          <ExpandedNavigation>
            <MenuToggleButton
              onClick={() => toggleShowMenu(!showMenu)}
              style={{ textAlign: 'right' }}
            >
              <IoCloseCircleOutline size="1.25rem" />
            </MenuToggleButton>
            {!isHome && <Link href="/">Home</Link>}
            {mobileNavLinks.map(({ href, name }) => (
              <Link href={`/${href}`}>
                {isCurrentRoute(href, currentRoute) ? (
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
                  {isCurrentRoute(href, currentRoute) ? (
                    <SelectedRoute>{`📍 ${name}`}</SelectedRoute>
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
      </LinkWrapper>
    </header>
  )
}
