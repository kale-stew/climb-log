export interface MasonryItem {
  width: number | null
  height: number | null
}

/** Columns that fit, matching CSS `columns: <min-width>` with a gap. */
export function columnCount(containerWidth: number, minColumnWidth: number, gap: number): number {
  return Math.max(1, Math.floor((containerWidth + gap) / (minColumnWidth + gap)))
}

/**
 * Assign each item, in order, to the currently shortest column (by aspect ratio).
 * Placement depends only on earlier items, so appending a page never moves the
 * photos already on screen; new ones land at the bottom of the columns.
 */
export function masonryColumns(items: MasonryItem[], count: number): number[][] {
  const columns: number[][] = Array.from({ length: Math.max(1, count) }, () => [])
  const heights = columns.map(() => 0)
  items.forEach((item, index) => {
    let shortest = 0
    for (let column = 1; column < heights.length; column++) {
      if (heights[column] < heights[shortest] - 0.001) shortest = column
    }
    columns[shortest].push(index)
    heights[shortest] += item.width && item.height ? item.height / item.width : 0.75
  })
  return columns
}
