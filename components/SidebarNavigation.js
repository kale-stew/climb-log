import Link from 'next/link'

const SidebarNavigation = ({ currentRoute, links }) =>
  links.map((link) => <Link href={`/${currentRoute}${link.href}`}>{link.title}</Link>)

export default SidebarNavigation
