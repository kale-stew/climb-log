import { describe, expect, it } from 'vitest'
import { columnCount, masonryColumns } from '../../src/lib/masonry'

const landscape = { width: 1200, height: 800 }
const portrait = { width: 800, height: 1200 }

describe('masonryColumns', () => {
  it('places each photo in the shortest column', () => {
    expect(masonryColumns([portrait, landscape, landscape, landscape], 2)).toEqual([[0], [1, 2, 3]])
  })

  it('never moves existing photos when a page is appended', () => {
    const firstPage = Array.from({ length: 60 }, (_, i) => (i % 3 === 0 ? portrait : landscape))
    const nextPage = Array.from({ length: 60 }, (_, i) => (i % 4 === 0 ? portrait : landscape))
    const before = masonryColumns(firstPage, 4)
    const after = masonryColumns([...firstPage, ...nextPage], 4)
    after.forEach((column, index) => {
      expect(column.slice(0, before[index].length)).toEqual(before[index])
      expect(column.slice(before[index].length).every(item => item >= 60)).toBe(true)
    })
  })

  it('treats a photo without dimensions as 4:3', () => {
    expect(masonryColumns([{ width: null, height: null }, landscape, landscape], 2)).toEqual([
      [0],
      [1, 2],
    ])
    expect(masonryColumns([{ width: null, height: null }, portrait, landscape], 2)).toEqual([
      [0, 2],
      [1],
    ])
  })
})

describe('columnCount', () => {
  it('fits columns like CSS columns', () => {
    expect(columnCount(1132, 260, 10.4)).toBe(4)
    expect(columnCount(1132, 420, 16)).toBe(2)
    expect(columnCount(200, 420, 16)).toBe(1)
  })
})
