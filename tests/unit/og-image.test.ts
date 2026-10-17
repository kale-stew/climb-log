import { describe, expect, it } from 'vitest'
import { ogImageSource } from '../../src/lib/og-image'

const API = 'https://photos.example'

describe('ogImageSource', () => {
  it('maps same-origin photo references to an absolute JPEG transform', () => {
    expect(ogImageSource('/img/9943163a/', API)).toBe('https://photos.example/img/9943163a?w=1600&format=jpeg')
    expect(ogImageSource('/img/abc123/?w=800', API)).toBe('https://photos.example/img/abc123?w=1600&format=jpeg')
  })

  it('keeps external HTTP images and rejects other schemes', () => {
    expect(ogImageSource('https://live.staticflickr.com/1/2_b.jpg', API)).toBe('https://live.staticflickr.com/1/2_b.jpg')
    expect(ogImageSource('javascript:alert(1)', API)).toBeNull()
    expect(ogImageSource('not a url', API)).toBeNull()
  })

  it('returns null for photo references without a photo service', () => {
    expect(ogImageSource('/img/9943163a/', undefined)).toBeNull()
  })
})
