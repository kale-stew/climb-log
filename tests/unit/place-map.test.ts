import { describe, expect, it } from 'vitest'
import {
  clusterPins,
  type MapFrame,
  type MapOuting,
  mapFrame,
  project,
} from '../../src/lib/place-map'

// Zoom 0 covers the world in 256px, so the frame below is the whole map.
const world: MapFrame = { zoom: 0, x0: 0, y0: 0, width: 256, height: 256 }

function outing(
  id: string,
  date: string,
  latitude: number,
  longitude: number,
  cover: string | null = `/img/${id}`,
): MapOuting {
  return { id, date, title: id, href: `/blog/hike/${id}`, cover, latitude, longitude }
}

describe('project', () => {
  it('places the equator and prime meridian at the center of a world frame', () => {
    expect(project(world, 0, 0)).toEqual({ x: 0.5, y: 0.5 })
  })

  it('drops points outside the frame', () => {
    const frame: MapFrame = { zoom: 0, x0: 0, y0: 0, width: 128, height: 256 }
    expect(project(frame, 0, 90)).toBeNull()
  })

  it('has a frame for every chapter map', () => {
    for (const slug of [
      'colorado',
      'utah',
      'arizona',
      'california',
      'pacific-northwest',
      'elsewhere',
    ]) {
      expect(mapFrame(slug)).not.toBeNull()
    }
  })

  it('places Colorado outings inside the Colorado map', () => {
    const frame = mapFrame('colorado')
    expect(frame).not.toBeNull()
    expect(project(frame as MapFrame, 39.74, -104.99)).not.toBeNull()
    expect(project(frame as MapFrame, 37.77, -122.42)).toBeNull()
  })
})

describe('clusterPins', () => {
  it('merges nearby outings under the newest one', () => {
    const pins = clusterPins(
      world,
      [
        outing('old', '2020-01-01', 39.7, -105),
        outing('new', '2024-01-01', 39.8, -105.1),
        outing('far', '2022-01-01', -3, 37),
      ],
      0.05,
    )
    expect(pins).toHaveLength(2)
    const merged = pins.find(pin => pin.count === 2)
    expect(merged?.lead.id).toBe('new')
  })

  it('uses the newest outing that has a cover for the thumbnail', () => {
    const pins = clusterPins(
      world,
      [outing('bare', '2024-01-01', 39.7, -105, null), outing('photo', '2020-01-01', 39.71, -105)],
      0.05,
    )
    expect(pins[0].lead.id).toBe('photo')
  })

  it('keeps outings apart when spacing is small', () => {
    const pins = clusterPins(
      world,
      [outing('a', '2024-01-01', 39.7, -105), outing('b', '2024-01-02', 45, -110)],
      0.001,
    )
    expect(pins).toHaveLength(2)
  })
})
