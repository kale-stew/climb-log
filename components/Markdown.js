import Image from 'next/image'
import ReactMarkdown from 'react-markdown'
import styled from '@emotion/styled'

const ImageWrapper = styled.div`
  display: flex;
  flex-direction: column;
  margin: 2rem auto;
  max-width: ${({ width }) => (width >= 768 ? 'auto' : `${width}px`)};
`

const ImageCaption = styled.span`
  text-align: center;
  font-size: 0.8rem;
  font-style: italic;
  color: var(--color-text-tertiary);
  margin: 0.5rem auto 0 auto;
  max-width: 75%;

  @media (max-width: 1024px) {
    max-width: 90%;
  }
`

export default function BlogMarkdown({ markdown }) {
  const MarkdownComponents = {
    p: (paragraph) => {
      const { node } = paragraph

      if (node.children[0].tagName === 'img') {
        const image = node.children[0]
        const alt = image.properties.alt?.replace(/ *\{[^)]*\} */g, '')
        const isPriority = image.properties.alt?.toLowerCase().includes('{priority}')
        const metaWidth = image.properties.alt.match(/{([^}]+)x/)
        const metaHeight = image.properties.alt.match(/x([^}]+)}/)
        const width = metaWidth ? metaWidth[1] : '768'
        const height = metaHeight ? metaHeight[1] : '576'

        return (
          <ImageWrapper width={width}>
            <Image
              src={image.properties.src}
              width={width}
              height={height}
              className="postImg"
              alt={alt}
              priority={isPriority}
            />
            <ImageCaption>{alt}</ImageCaption>
          </ImageWrapper>
        )
      }
      return <p>{paragraph.children}</p>
    },
  }

  return <ReactMarkdown components={MarkdownComponents}>{markdown}</ReactMarkdown>
}
