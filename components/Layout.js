import Link from 'next/link'

export default function Layout({ children, home }) {
  return (
    <div className="wrapper">
      <header className="header">
        <Link href="/climb-log">Climb Log</Link>
        <Link href="/work">Work</Link>
        <Link href="/about">About</Link>
      </header>

      <main>{children}</main>
      {!home && (
        <div className="backToHome">
          <Link href="/">
            <a>← Back to home</a>
          </Link>
        </div>
      )}
    </div>
  )
}
