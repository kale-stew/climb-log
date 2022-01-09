import Link from 'next/link'
import styles from './BlogNavigation.module.css'

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
        <a>{postIds[nextPost].title} →</a>
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
        <a>← {postIds[prevPost].title}</a>
      </Link>
    )
  }
  // If there are posts before before and after this one, let's have links leading to each one
  if (nextPost != -1 && prevPost != -1) {
    return (
      <div className={styles.blogNavigation}>
        {prevPostLink}
        <span className={styles.blogNavigationSeparator}></span>
        {nextPostLink}
      </div>
    )
  }
  // If there is no previous post, let's have back to blog and next post Links available
  if (prevPost == -1 && nextPost != -1) {
    return (
      <div className={styles.blogNavigation}>
        <Link href="/blog">
          <a>← Back to blog</a>
        </Link>
        <span className={styles.blogNavigationSeparator}></span>
        {nextPostLink}
      </div>
    )
  }
  // If there is no next post but a previous post, let's show that
  if (nextPost == -1 && prevPost != -1) {
    return (
      <div className={styles.blogNavigation}>
        {prevPostLink}
        <span className={styles.blogNavigationSeparator}></span>
        <Link href="/blog">
          <a> Back to blog →</a>
        </Link>
      </div>
    )
  }
  // Always return something
  return (
    <div className={styles.blogNavigation}>
      <Link href="/blog">
        <a>← Back to blog</a>
      </Link>
    </div>
  )
}
