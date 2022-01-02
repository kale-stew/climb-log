import { fmt } from '../notion'

/**
 * Formats an array of photos returned from the Notion query
 */
const formatPhotos = (response) => {
  return response.map((result) => {
    const {
      id,
      properties: { accent_color, height, href, taken_on, title, width },
    } = result

    const finalObj = {
      id,
      title: fmt(title),
      date: fmt(taken_on),
      href: fmt(href),
      width: fmt(width),
      height: fmt(height),
      bgColor: fmt(accent_color),
    }
    return finalObj
  }, [])
}

/**
 * Fetch an image from all-photos based on the linkedDatabase id
 * params: a notion id (l0ng-r4ndom-hash)
 * returns a flickr href
 */
const fetchRelatedImg = (id) => {}

/**
 * Fetch all images from the all-photos db
 * no params
 * returns an arr of images
 */
const fetchAllImages = () => {}

export { fetchAllImages, fetchRelatedImg }
