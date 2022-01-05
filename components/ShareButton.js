import React from 'react'
import { FiFacebook, FiTwitter } from 'react-icons/fi'
import { METADATA } from '../utils/constants'

import styles from './ShareButton.module.css'

const shareToFacebook = (href, text) => {
  // to use:
  //   const onClickTwitterIcon = (e) => {
  //     e.preventDefault()
  //     return shareToTwitter(window.location.href, text)
  //   }
  window.FB.ui({
    method: 'share',
    mobile_iframe: true,
    href,
    quote: text,
  })
}

const shareToTwitter = (href, text) => {
  // to use:
  //   const onClickFacebookIcon = (e) => {
  //     e.preventDefault()
  //     return shareToFacebook(window.location.href, text)
  //   }
  window.open(
    `https://twitter.com/share?url=${encodeURI(encodeURI(href))}&text=${text}`,
    'sharer',
    'toolbar=0,status=0,width=626,height=436'
  )
}

const ShareButton = ({ type, data }) => {
  switch (type) {
    case 'twitter':
      return (
        <>
          <a
            className={`${styles.socialLink} ${styles.twitter}`}
            href="https://twitter.com/share?ref_src=twsrc%5Etfw"
            data-text={`Read '${data.title}' on ${METADATA.SITE_NAME} by @${METADATA.TWITTER_HANDLE}`}
            data-url={data.href}
          >
            Share on <FiTwitter />
            Twitter
          </a>
        </>
      )
    case 'facebook':
      return (
        <>
          <a
            className={`${styles.socialLink} ${styles.facebook}`}
            data-text={`Read '${data.title}' on ${METADATA.SITE_NAME} by @${METADATA.FULL_NAME}`}
            data-url={data.href}
          >
            Share on <FiFacebook />
            Facebook
          </a>
        </>
      )
  }
}

export default ShareButton
