import Head from 'next/head'
import Image from 'next/image'
import Layout from '../components/Layout'
import CapitolCreek from '../public/photos/2021_capitol-creek.jpg'

import styles from '../components/Layout.module.css'

const HomePage = () => (
  <Layout home>
    <Head>
      <title>Kylie Stewart | Photography, Hiking</title>
      <script
          async
          src="https://www.googletagmanager.com/gtag/js?id=G-W9WRKKHEN8"
        />

        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-W9WRKKHEN8', { page_path: window.location.pathname });
            `,
          }}
        />
    </Head>
    <br />
    <Image
      src={CapitolCreek}
      alt="Looking through fall colors towards Capitol Peak in Aspen, Colorado."
      layout="intrinsic"
      placeholder="blur"
    ></Image>
  </Layout>
)

export default HomePage
