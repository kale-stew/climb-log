import Link from 'next/link'
import Category from '../../components/Category'
import FormattedDate from '../../components/Date'
import Layout from '../../components/Layout'
import { getAllPostIds, getPostData } from '../../utils/posts'
import CustomHead from '../../components/CustomHead'

import utilStyles from '../../styles/utils.module.css'

const Post = ({ postData }) => (
  <Layout>
    <CustomHead title={`${postData.title} | kylies.photos`} />
    <article>
      <h1 className={utilStyles.headingXl}>{postData.title}</h1>
      <div className={`${utilStyles.lightText} ${utilStyles.singleRow}`}>
        <FormattedDate dateString={postData.date} withDOW />{' '}
        <Category category={postData.category} />
      </div>
      <div dangerouslySetInnerHTML={{ __html: postData.contentHtml }} />
    </article>
    <div className={utilStyles.backToHome}>
      <Link href="/blog">
        <a>← Back to blog</a>
      </Link>
    </div>
  </Layout>
)

export async function getStaticPaths() {
  const paths = getAllPostIds()

  return {
    paths,
    fallback: false,
  }
}

export async function getStaticProps({ params }) {
  const postData = await getPostData(params.category, params.id)

  return {
    props: {
      postData,
    },
  }
}

export default Post
