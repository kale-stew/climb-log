import Link from 'next/link'
import styled from '@emotion/styled'
import { shakeLeft, shakeRight } from '../styles/animations'

const BlogNavigation = styled.div`
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  max-width: 70%;
  margin: 1rem auto 2rem auto;
`

const NavigationRight = styled.span`
  text-align: right;
  text-decoration: none;
  color: var(--color-text-secondary);
  &:hover {
    cursor: pointer;
    animation: ${shakeRight} 0.3s;
    animation-iteration-count: 2;
  }
`

const NavigationLeft = styled.span`
  text-align: left;
  text-decoration: none;
  color: var(--color-text-secondary);
  &:hover {
    cursor: pointer;
    animation: ${shakeLeft} 0.3s;
    animation-iteration-count: 2;
  }
`

const NavigationDivider = styled.hr`
  border: 1px solid transparent;
  @media (max-width: 800px) {
    border: 1px solid var(--color-text-primary);
    margin: 0 6vw;
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
        <NavigationDivider></NavigationDivider>
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
        <NavigationDivider></NavigationDivider>
        {nextPostLink}
      </BlogNavigation>
    )
  }
  // If there is no next post but a previous post, let's show that
  if (nextPost == -1 && prevPost != -1) {
    return (
      <BlogNavigation>
        {prevPostLink}
        <NavigationDivider></NavigationDivider>
        <Link href="/blog">
          <NavigationRight> Back to blog →</NavigationRight>
        </Link>
      </BlogNavigation>
    )
  }

  return (
    <BlogNavigation>
      <Link href="/blog">
        <NavigationLeft>← Back to blog</NavigationLeft>
      </Link>
    </BlogNavigation>
  )
}
