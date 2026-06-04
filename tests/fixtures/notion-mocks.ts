/**
 * Mock Notion API responses for testing
 */

export const mockClimbPage = {
  id: '18e01b50-4364-8024-85d8-e12aba9ac803',
  properties: {
    Name: { title: [{ plain_text: 'Green Mountain' }] },
    Date: { date: { start: '2024-06-15' } },
    Slug: { rich_text: [{ plain_text: 'green-mountain-june-2024' }] },
    'Preview Image': { files: [{ file: { url: 'https://example.com/img.jpg' } }] },
    Distance: { number: 8.5 },
    Gain: { number: 2800 },
    'Max Elevation': { number: 14264 },
    'Moving Time': { number: 240 },
    Area: { select: { name: 'Front Range' } },
    State: { select: { name: 'Colorado' } },
    Strava: { url: 'https://strava.com/activities/123' },
    AllTrails: { url: null },
    Published: { checkbox: true },
  },
}

export const mockPeakPage = {
  id: '28e01b50-4364-8024-85d8-e12aba9ac804',
  properties: {
    Name: { title: [{ plain_text: 'Longs Peak' }] },
    Elevation: { number: 14255 },
    Prominence: { number: 2920 },
    Range: { select: { name: 'Front Range' } },
    'First Completed': { date: { start: '2023-08-10' } },
    Attempts: { number: 2 },
    Class: { select: { name: '3' } },
  },
}

export const mockGearPage = {
  id: '38e01b50-4364-8024-85d8-e12aba9ac805',
  properties: {
    Name: { title: [{ plain_text: 'Garmin InReach Mini' }] },
    Brand: { select: { name: 'Garmin' } },
    Category: { select: { name: 'Electronics' } },
    'Weight (oz)': { number: 3.5 },
    Price: { number: 350 },
    Rating: { number: 5 },
    Status: { select: { name: 'Own' } },
    Notes: { rich_text: [{ plain_text: 'Essential for solo hikes' }] },
    URL: { url: 'https://rei.com/product/123' },
    Image: { files: [{ external: { url: 'https://example.com/garmin.jpg' } }] },
  },
}

export const mockPhotoPage = {
  id: '48e01b50-4364-8024-85d8-e12aba9ac806',
  properties: {
    href: { url: 'https://example.com/photo.jpg' },
    Caption: { title: [{ plain_text: 'Summit view at sunrise' }] },
    Date: { date: { start: '2024-06-15T06:30:00' } },
    area_fallback: { rich_text: [{ plain_text: 'Front Range, Colorado' }] },
    tags: { rich_text: [{ plain_text: 'sunrise, summit, 14er' }] },
    width: { number: 4000 },
    height: { number: 3000 },
    exclude: { checkbox: false },
  },
}

export function createMockNotion(pages: any[] = []) {
  return {
    databases: {
      query: async ({ database_id, start_cursor, page_size }: any) => ({
        results: pages,
        has_more: false,
        next_cursor: null,
      }),
    },
    blocks: {
      children: {
        list: async ({ block_id }: any) => ({
          results: [
            {
              type: 'paragraph',
              paragraph: {
                rich_text: [{ plain_text: 'Test content from Notion' }],
              },
            },
          ],
          has_more: false,
          next_cursor: null,
        }),
      },
    },
  }
}
