import path from 'path'
// import { compileLocalTemplate } from '@resoc/create-img'
// import { FacebookOpenGraph } from '@resoc/core'
import { PREVIEW_CARD_COLORS } from './constants'

async function socialImage({
  title,
  description,
  baseName,
  previewImgUrl,
  bgColor = PREVIEW_CARD_COLORS.grey,
  textColor = PREVIEW_CARD_COLORS.white,
}) {
  const ogImage = await compileLocalTemplate(
    'resoc-template/resoc.manifest.json',
    {
      title,
      description,
      previewImgUrl,
      bgColor,
      textColor,
    },
    FacebookOpenGraph,
    `public/open-graph/${baseName}.jpg`
  )

  return {
    title,
    description,
    baseName,
    ogImage: path.basename(ogImage),
  }
}

export { socialImage }
