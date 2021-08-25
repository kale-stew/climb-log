import Head from 'next/head'
import Header from '../components/Header'

import '../styles/index.css'

const App = ({ Component, pageProps }) => (
  <>
    <Head>
      <meta name="author" content="Kylie Stewart" />
      <meta name="theme-color" content="#ff821c" />
      <link rel="icon" type="image/ico" href="/favicon.ico" />
      <link rel="manifest" href="/manifest.json"></link>
    </Head>
    <Header />
    <Component {...pageProps} />
  </>
)

export default App
