import React from 'react'
import styled from '@emotion/styled'
import { /*FiFacebook,*/ FiTwitter } from 'react-icons/fi'
import { METADATA } from '../utils/constants'

// const FacebookShareButton = styled.button`
//   --color-fb-blue: #365aa9;
//   color: white;
//   box-shadow: inset 0 -2em 0 0 var(--color-fb-blue);
//   vertical-align: middle;
//   cursor: pointer;
//   display: flex;
//   align-items: center;
//   gap: 0.25em;
//   padding: 0.2em 0.5em;
//   &:hover {
//     box-shadow: inset 0 -2em 0 0 var(--color-bg-primary);
//     color: var(--color-fb-blue);
//   }
// `

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

// const shareToFacebook = (href, text) => {
//   window.FB.ui({
//     method: 'share',
//     mobile_iframe: true,
//     href,
//     quote: text,
//   })
// }

const shareToTwitter = (href, text) => {
  window.open(
    `https://twitter.com/share?url=${encodeURI(encodeURI(href))}&text=${text}`,
    'sharer',
    'toolbar=0,status=0,width=626,height=436'
  )
}

const ShareButton = ({ type, data }) => {
  const onClickTwitterIcon = (e, text) => {
    e.preventDefault()
    return shareToTwitter(window.location.href, text)
  }

  // const onClickFacebookIcon = (e, text) => {
  //   e.preventDefault()
  //   return shareToFacebook(window.location.href, text)
  // }

  switch (type) {
    // case 'facebook':
    //   const fbTxt = `Read '${data.title}' by @${METADATA.FULL_NAME}`
    //   return (
    //     <>
    //       <FacebookShareButton onClick={(e) => onClickFacebookIcon(e, fbTxt)}>
    //         Share on <FiFacebook style={{ margin: 'auto 0' }} />
    //         Facebook
    //       </FacebookShareButton>
    //     </>
    //   )
    case 'twitter':
      const twtTxt = `Read '${data.title}' by @${METADATA.TWITTER_HANDLE}`
      return (
        <>
          <TwitterShareButton onClick={(e) => onClickTwitterIcon(e, twtTxt)}>
            Share on <FiTwitter style={{ margin: 'auto 0' }} />
            Twitter
          </TwitterShareButton>
        </>
      )
    default:
      return null
  }
}

export default ShareButton
