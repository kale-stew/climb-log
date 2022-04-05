import BlogMarkdown from '../../components/Markdown'
import Category from '../../components/Category'
import FormattedDate from '../../components/Date'
import Layout from '../../components/Layout'
import Link from 'next/link'
// import ShareButton from '../../components/ShareButton'
import SidebarNavigation from '../../components/SidebarNavigation'
import styled from '@emotion/styled'
import { METADATA, PREVIEW_CARD_COLORS } from '../../utils/constants'
import { buildNavigation } from '../../components/BlogNavigation'
import {
  getAllPostIds,
  getPageHeaders,
  getPostData,
  getSortedPostsData,
} from '../../utils/data/posts'
import { shake } from '../../styles/animations'
import { socialImage } from '../../utils/social-image'

import utilStyles from '../../styles/utils.module.css'

const ArticleWrapper = styled.div`
  width: 100vw;
  display: flex;
  justify-content: space-around;
`

const BackToTop = styled.span`
  margin: 2rem auto 2rem auto;
  font-size: 1.2rem;
  a {
    color: var(--primary-text-color);
    &:hover {
      cursor: pointer;
      animation: ${shake} 0.3s;
      animation-iteration-count: 2;
    }
  }
`

const Post = ({ pageHeaders, postData, postIds }) => (
  <Layout home>
    <ArticleWrapper>
      <article>
        <h1 id="title" className={utilStyles.headingXl}>
          {postData.title}
        </h1>
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
      <SidebarNavigation
        currentRoute={`${postData.category}/${postData.id}`}
        links={pageHeaders}
      />
    </ArticleWrapper>
    <BackToTop className={utilStyles.shownForMobile}>
      <Link href={`/${postData.category}/${postData.id}#title`}>Back to top ↑</Link>
    </BackToTop>
    {/* <div className={styles.socialButtons}>
      <ShareButton type="twitter" data={postData} />
      <ShareButton type="facebook" data={postData} />
    </div> */}
    {buildNavigation(postIds, postData)}
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
