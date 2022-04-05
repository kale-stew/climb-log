import Link from 'next/link'
import styled from '@emotion/styled'
import { useRouter } from 'next/router'

const SidebarWrapper = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  position: fixed;
  right: 0;
  top: 5;
  height: 65%;
  padding: 7vh 5vw 7vh 4rem;
  line-height: 2;
  font-size: 1.1rem;
  font-family: 'Playfair Display', serif;
  a {
    color: var(--primary-text-color);
    &:hover {
      text-decoration: underline;
    }
  }
  @media (max-width: 1024px) {
    display: none;
  }
`

const SidebarNavigation = ({ currentRoute, links }) => {
  const router = useRouter()
  return (
    <SidebarWrapper className="sidebar">
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <span
          style={{
            fontSize: '1.5rem',
            fontWeight: 600,
          }}
        >
          Jump to...
        </span>
        {links.map((link) => (
          <Link href={`/${currentRoute}${link.href}`}>
            {router.asPath.includes(link.href) ? (
              <strong>{link.title}</strong>
            ) : (
              link.title
            )}
          </Link>
        ))}
      </div>
      <Link href={`/${currentRoute}#title`}>Back to top ↑</Link>
    </SidebarWrapper>
  )
}

export default SidebarNavigation
