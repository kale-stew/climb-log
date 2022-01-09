import Link from 'next/link'
import styled from '@emotion/styled'
import { keyframes } from '@emotion/react'

import styles from './BlogNavigation.module.css'

const shakeLeft = keyframes`
  0% {
    transform: translate(1px);
  }
  50% {
    transform: translate(-6px);
  }
  100% {
    transform: translate(0px);
  }
`

const shakeRight = keyframes`
0% {
  transform: translate(-1px);
}
50% {
  transform: translate(6px);
}
100% {
  transform: translate(0px);
}
`

const BlogNavigation = styled.div`
  display: flex;
  justify-content: space-between;
`

const NavigationRight = styled.span`
  text-align: center;
  text-decoration: none;
  color: var(--color-text-secondary);
  padding: 0.05em;
  &:hover {
    cursor: pointer;
    animation: ${shakeRight} 0.3s;
    animation-iteration-count: 2;
  }
`

const NavigationLeft = styled.span`
  text-align: center;
  text-decoration: none;
  color: var(--color-text-secondary);
  padding: 0.05em;
  &:hover {
    cursor: pointer;
    animation: ${shakeLeft} 0.3s;
    animation-iteration-count: 2;
  }
`

/**
 * buildNavigation uses the sorted posts data to find it's own index, the next post's,
 * and the previous post's index (if they exist). Now that it knows where it is in the
 * sorted data, we can generate the nav links for the bottom of the page.
 * @returns next js <Link/>
 */
export const buildNavigation = (postIds, postData) => {
  let selfPosition = postIds.findIndex((post) => post.id === postData.id)
  let nextPost = -1
  let prevPost = -1
  let nextPostLink
  let prevPostLink

  // This means we have previous post, let's set it's index and create the link
  if (selfPosition + 1 <= postIds.length - 1) {
    nextPost = selfPosition + 1
    nextPostLink = (
      <Link
        href="/[category]/[id]"
        as={`/${postIds[nextPost].category}/${postIds[nextPost].id}`}
      >
        <NavigationRight>{postIds[nextPost].title} →</NavigationRight>
      </Link>
    )
  }
  // This means we have a next post, let's set it's index and create the link
  if (selfPosition - 1 >= 0) {
    prevPost = selfPosition - 1
    prevPostLink = (
      <Link
        href="/[category]/[id]"
        as={`/${postIds[prevPost].category}/${postIds[prevPost].id}`}
      >
        <NavigationLeft>← {postIds[prevPost].title}</NavigationLeft>
      </Link>
    )
  }
  // If there are posts before before and after this one, let's have links leading to each one
  if (nextPost != -1 && prevPost != -1) {
    return (
      <BlogNavigation>
        {prevPostLink}
        <span className={styles.blogNavigationSeparator}></span>
        {nextPostLink}
      </BlogNavigation>
    )
  }
  // If there is no previous post, let's have back to blog and next post Links available
  if (prevPost == -1 && nextPost != -1) {
    return (
      <BlogNavigation>
        <Link href="/blog">
          <NavigationLeft>← Back to blog</NavigationLeft>
        </Link>
        <span className={styles.blogNavigationSeparator}></span>
        {nextPostLink}
      </BlogNavigation>
    )
  }
  // If there is no next post but a previous post, let's show that
  if (nextPost == -1 && prevPost != -1) {
    return (
      <BlogNavigation>
        {prevPostLink}
        <span className={styles.blogNavigationSeparator}></span>
        <Link href="/blog">
          <NavigationRight> Back to blog →</NavigationRight>
        </Link>
      </BlogNavigation>
    )
  }
  // Always return something
  return (
    <BlogNavigation>
      <Link href="/blog">
        <a>← Back to blog</a>
      </Link>
    </BlogNavigation>
  )
}
