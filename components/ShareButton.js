import React from 'react'
import styled from '@emotion/styled'
import { FiFacebook, FiTwitter } from 'react-icons/fi'
import { METADATA } from '../utils/constants'

const FacebookShareButton = styled.button`
  --color-fb-blue: #365aa9;
  color: white;
  box-shadow: inset 0 -2em 0 0 var(--color-fb-blue);
  vertical-align: middle;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.25em;
  padding: 0.2em 0.5em;
  &:hover {
    box-shadow: inset 0 -2em 0 0 var(--color-bg-primary);
    color: var(--color-fb-blue);
  }
`
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
const TwitterShareButton = styled.button`
  --color-t-blue: #5ba4d5;
  color: white;
  box-shadow: inset 0 -2em 0 0 var(--color-t-blue);
  vertical-align: middle;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.25em;
  padding: 0.2em 0.5em;
  &:hover {
    box-shadow: inset 0 -2em 0 0 var(--color-bg-primary);
    color: var(--color-t-blue);
  }
`
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
          <TwitterShareButton
            href="https://twitter.com/share?ref_src=twsrc%5Etfw"
            data-text={`Read '${data.title}' on ${METADATA.SITE_NAME} by @${METADATA.TWITTER_HANDLE}`}
            data-url={data.href}
          >
            Share on <FiTwitter style={{ margin: 'auto 0' }} />
            Twitter
          </TwitterShareButton>
        </>
      )
    case 'facebook':
      return (
        <>
          <FacebookShareButton
            data-text={`Read '${data.title}' on ${METADATA.SITE_NAME} by @${METADATA.FULL_NAME}`}
            data-url={data.href}
          >
            Share on <FiFacebook style={{ margin: 'auto 0' }} />
            Facebook
          </FacebookShareButton>
        </>
      )
  }
}

export default ShareButton
