import Link from 'next/link'
import Category from '../../components/Category'
import FormattedDate from '../../components/Date'
import Layout from '../../components/Layout'
import ReactMarkdown from 'react-markdown'
import ShareButton from '../../components/ShareButton'
import { COLORS } from '../../utils/constants'
import { getAllPostIds, getPostData, getSortedPostsData } from '../../utils/data/posts'
import { socialImage } from '../../utils/social-image'

import styles from '../../styles/blog.module.css'
import utilStyles from '../../styles/utils.module.css'

const Post = ({ postData, postIds }) => {
  /**
   * buildNavigation uses the sorted posts data to find it's own index, the next post's,
   * and the previous post's index (if they exist). Now that it knows where it is in the
   * sorted data, we can generate the nav links for the bottom of the page.
   * @returns next js <Link/>
   */
  const buildNavigation = () => {
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

  return (
    <Layout>
      <article>
        <h1 className={utilStyles.headingXl}>{postData.title}</h1>
        <div className={`${utilStyles.singleRow} ${utilStyles.centerTextForMobile}`}>
          <FormattedDate
            dateString={postData.date}
            className={utilStyles.shownForMobile}
          />
          <FormattedDate
            dateString={postData.date}
            withDOW
            className={utilStyles.hiddenForMobile}
          />
          <Category category={postData.category} pushToRouter={true} />
        </div>
        <ReactMarkdown>{postData.content}</ReactMarkdown>
      </article>
      <div className={styles.socialButtons}>
        <ShareButton type="twitter" data={postData} />
        <ShareButton type="facebook" data={postData} />
      </div>
      {buildNavigation()}
    </Layout>
  )
}

export async function getStaticPaths() {
  const paths = getAllPostIds()
  return {
    paths,
    fallback: false,
  }
}

export async function getStaticProps({ params }) {
  const postData = await getPostData(params.category, params.id)
  const postIds = getSortedPostsData()
  const title = postData.title
  const description = 'by Kylie Stewart'

  return {
    props: {
      postData,
      postIds,
      title,
      description,
      ...(await socialImage({
        title,
        description,
        previewImgUrl: postData.previewImgUrl,
        baseName: `post-${params.id}`,
        bgColor: postData.bgColor ? postData.bgColor : COLORS.teal,
        textColor: postData.textColor ? postData.textColor : COLORS.white,
      })),
    },
  }
}

export default Post
