import Head from 'next/head'
import Header from '../components/Header'

import '../styles/index.css'

const App = ({ Component, pageProps }) => (
  <>
    <Header />
    <Component {...pageProps} />
  </>
)

export default App
