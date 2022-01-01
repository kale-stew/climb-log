import path from 'path'
import { compileLocalTemplate } from '@resoc/create-img'
import { FacebookOpenGraph } from '@resoc/core'

async function socialImage({ title, description, baseName, mainImageUrl }) {
  const ogImage = await compileLocalTemplate(
    'resoc-template/resoc.manifest.json',
    {
      title,
      description,
      mainImageUrl,
    },
    FacebookOpenGraph,
    `public/open-graph/${baseName}-{{ hash }}.jpg`,
    { cache: true }
  )

  return {
    title,
    description,
    ogImage: path.basename(ogImage),
  }
}

export { socialImage }
