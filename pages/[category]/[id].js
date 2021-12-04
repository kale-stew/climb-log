import Head from 'next/head'
import Link from 'next/link'
import Category from '../../components/Category'
import FormattedDate from '../../components/Date'
import Layout from '../../components/Layout'
import { getAllPostIds, getPostData, getSortedPostsData } from '../../utils/posts'

import utilStyles from '../../styles/utils.module.css'

const Post = ({ postData, postIds }) => {
  const buildNavigation = () => {
    let selfPosition = postIds.findIndex((post) => post.id === postData.id)
    let nextPost = -1
    let prevPost = -1
    let nextPostLink
    let prevPostLink

    if (selfPosition + 1 <= postIds.length - 1) {
      nextPost = selfPosition + 1
      nextPostLink = (
        <Link
          href="/[category]/[id]"
          as={`/${postIds[nextPost].category}/${postIds[nextPost].id}`}
        >
          <a>{postIds[nextPost].title} -></a>
        </Link>
      )
    }
    if (selfPosition - 1 >= 0) {
      prevPost = selfPosition - 1
      prevPostLink = (
        <Link
          href="/[category]/[id]"
          as={`/${postIds[prevPost].category}/${postIds[prevPost].id}`}
        >
          <a>←{postIds[prevPost].title}</a>
        </Link>
      )
    }
    // If there are posts before before and after this one, let's have links leading to each one
    if (nextPost != -1 && prevPost != -1) {
      return (
        <div className={utilStyles.backToHome}>
          {prevPostLink}
          <br/>
          {nextPostLink}
        </div>
      )
    }
    // If there is no previous post, let's have back to blog and next post Links available
    if (prevPost == -1 && nextPost != -1) {
      return (
        <div className={utilStyles.backToHome}>
          <Link href="/blog">
            <a>← Back to blog</a>
          </Link>
          <br/>
          {nextPostLink}
        </div>
      )
    }
    // If there is no next post but a previous post, let's show that
    if (nextPost == -1 && prevPost != -1) {
      return (<div className={utilStyles.backToHome}>
        {prevPostLink}
        <br/>
        <Link href="/blog">
          <a> Back to blog ->?</a>
        </Link>
      </div>)
    }
    return (
      <div className={utilStyles.backToHome}>
        <Link href="/blog">
          <a>← Back to blog</a>
        </Link>
      </div>
    )
  }

  return (
    <Layout>
      <Head>
        <title>{postData.title} | kylies.photos</title>
      </Head>
      <article>
        <h1 className={utilStyles.headingXl}>{postData.title}</h1>
        <div className={`${utilStyles.lightText} ${utilStyles.singleRow}`}>
          <FormattedDate dateString={postData.date} withDOW />{' '}
          <Category category={postData.category} />
        </div>
        <div dangerouslySetInnerHTML={{ __html: postData.contentHtml }} />
      </article>
      <div className={utilStyles.backToHome}>
        {buildNavigation()}
      </div>
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

  return {
    props: {
      postData,
      postIds,
    },
  }
}

export default Post
