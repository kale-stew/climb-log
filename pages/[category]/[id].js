import BlogMarkdown from '../../components/Markdown'
import Category from '../../components/Category'
import FormattedDate from '../../components/Date'
import Layout from '../../components/Layout'
import ShareButton from '../../components/ShareButton'
import SidebarNavigation from '../../components/SidebarNavigation'
import { METADATA, PREVIEW_CARD_COLORS } from '../../utils/constants'
import { buildNavigation } from '../../components/BlogNavigation'
import {
  getAllPostIds,
  getPageHeaders,
  getPostData,
  getSortedPostsData,
} from '../../utils/data/posts'
import { socialImage } from '../../utils/social-image'

import styles from '../../styles/blog.module.css'
import utilStyles from '../../styles/utils.module.css'

const Post = ({ pageHeaders, postData, postIds }) => (
  <Layout>
    <SidebarNavigation
      currentRoute={`${postData.category}/${postData.id}`}
      links={pageHeaders}
    />
    <>
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
        <BlogMarkdown markdown={postData.content} />
      </article>
      <div className={styles.socialButtons}>
        <ShareButton type="twitter" data={postData} />
        <ShareButton type="facebook" data={postData} />
      </div>
      {buildNavigation(postIds, postData)}
    </>
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
  const pageHeaders = await getPageHeaders(postData)
  const postIds = getSortedPostsData()
  const title = postData.title
  const description = `by ${METADATA.FULL_NAME}`

  return {
    props: {
      pageHeaders,
      postData,
      postIds,
      title,
      description,
      ...(await socialImage({
        title,
        description,
        previewImgUrl: postData.previewImgUrl,
        baseName: `post-${params.id}`,
        bgColor: postData.bgColor ? postData.bgColor : PREVIEW_CARD_COLORS.teal,
        textColor: postData.textColor ? postData.textColor : PREVIEW_CARD_COLORS.white,
      })),
    },
  }
}

export default Post
