#!/usr/bin/env node
/**
 * Builds the static chapter maps under public/maps/ and their projection frames
 * in src/lib/place-map-frames.json.
 *
 * Each chapter gets three single-color SVG layers (land, lines, contours). The
 * page paints them through CSS masks so they follow the site theme. Contours
 * come from the public AWS terrain tiles (Terrarium encoding).
 *
 * Usage: node scripts/build-place-maps.mjs [slug...]
 */
import fs from 'node:fs'
import path from 'node:path'
import { contours } from 'd3-contour'
import { geoClipRectangle, geoMercator, geoPath } from 'd3-geo'
import { PNG } from 'pngjs'
import { feature, merge, mesh } from 'topojson-client'
import us from 'us-atlas/states-10m.json' with { type: 'json' }
import world50 from 'world-atlas/countries-50m.json' with { type: 'json' }
import world110 from 'world-atlas/countries-110m.json' with { type: 'json' }

const ROOT = path.resolve(import.meta.dirname, '..')
const MAP_DIR = path.join(ROOT, 'public/maps')
const FRAMES_FILE = path.join(ROOT, 'src/lib/place-map-frames.json')
const TILE_CACHE = path.join(process.env.TMPDIR || '/tmp', 'place-map-tiles')
const TILE_URL = 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium'

// [west, south, east, north], with headroom above the north edge for pins; zoom, contour interval (m), index contour every N lines
const CHAPTERS = {
  colorado: { bbox: [-109.3, 36.8, -101.8, 41.7], zoom: 8, interval: 250, index: 4 },
  utah: { bbox: [-114.3, 36.8, -108.8, 42.7], zoom: 8, interval: 250, index: 4 },
  arizona: { bbox: [-115, 31.2, -108.8, 37.6], zoom: 8, interval: 250, index: 4 },
  california: { bbox: [-124.6, 32.3, -113.9, 42.8], zoom: 7, interval: 300, index: 5 },
  'pacific-northwest': { bbox: [-125, 41.8, -110.8, 49.8], zoom: 7, interval: 300, index: 5 },
  elsewhere: { bbox: [-168, -12, 44, 76], zoom: 3, interval: 600, index: 5 },
}

const TILE = 256
const worldPx = zoom => TILE * 2 ** zoom
const lngToX = (lng, zoom) => ((lng + 180) / 360) * worldPx(zoom)
const latToY = (lat, zoom) => {
  const rad = (lat * Math.PI) / 180
  return ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * worldPx(zoom)
}

async function tile(zoom, x, y) {
  const file = path.join(TILE_CACHE, `${zoom}-${x}-${y}.png`)
  if (!fs.existsSync(file)) {
    const res = await fetch(`${TILE_URL}/${zoom}/${x}/${y}.png`)
    if (!res.ok) throw new Error(`terrain tile ${zoom}/${x}/${y}: HTTP ${res.status}`)
    fs.mkdirSync(TILE_CACHE, { recursive: true })
    fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()))
  }
  return PNG.sync.read(fs.readFileSync(file))
}

/** Elevation grid over the frame, downsampled by `step` pixels and lightly smoothed. */
async function elevationGrid(frame, step) {
  const { zoom, x0, y0, width, height } = frame
  const cols = Math.ceil(width / step)
  const rows = Math.ceil(height / step)
  const grid = new Float64Array(cols * rows)
  const tiles = new Map()
  for (let ty = Math.floor(y0 / TILE); ty <= Math.floor((y0 + height) / TILE); ty++) {
    for (let tx = Math.floor(x0 / TILE); tx <= Math.floor((x0 + width) / TILE); tx++) {
      tiles.set(`${tx},${ty}`, await tile(zoom, tx, ty))
    }
  }
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const gx = Math.min(x0 + col * step, x0 + width - 1)
      const gy = Math.min(y0 + row * step, y0 + height - 1)
      const png = tiles.get(`${Math.floor(gx / TILE)},${Math.floor(gy / TILE)}`)
      const i = ((Math.floor(gy) % TILE) * TILE + (Math.floor(gx) % TILE)) * 4
      grid[row * cols + col] = png.data[i] * 256 + png.data[i + 1] + png.data[i + 2] / 256 - 32768
    }
  }
  // Two box-blur passes: contours read as hand-drawn rather than pixel-stepped.
  for (let pass = 0; pass < 2; pass++) {
    const copy = grid.slice()
    for (let row = 1; row < rows - 1; row++) {
      for (let col = 1; col < cols - 1; col++) {
        let sum = 0
        for (let dy = -1; dy <= 1; dy++)
          for (let dx = -1; dx <= 1; dx++) sum += copy[(row + dy) * cols + col + dx]
        grid[row * cols + col] = sum / 9
      }
    }
  }
  return { grid, cols, rows }
}

function svg(width, height, body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">${body}</svg>\n`
}

async function build(slug) {
  const config = CHAPTERS[slug]
  const [west, south, east, north] = config.bbox
  const x0 = Math.round(lngToX(west, config.zoom))
  const y0 = Math.round(latToY(north, config.zoom))
  const width = Math.round(lngToX(east, config.zoom)) - x0
  const height = Math.round(latToY(south, config.zoom)) - y0
  const frame = { zoom: config.zoom, x0, y0, width, height }

  const projection = geoMercator()
    .scale(worldPx(config.zoom) / (2 * Math.PI))
    .translate([worldPx(config.zoom) / 2 - x0, worldPx(config.zoom) / 2 - y0])
    .postclip(geoClipRectangle(-8, -8, width + 8, height + 8))
  const project = geoPath(projection).digits(1)

  // World-scale frames use the coarser outlines; detail would be invisible and heavy.
  const world = config.zoom <= 4 ? world110 : world50
  const land = merge(world, world.objects.countries.geometries)
  const countryLines = mesh(world, world.objects.countries, (a, b) => a !== b)
  const coast = mesh(world, world.objects.countries, (a, b) => a === b)
  const stateLines = mesh(us, us.objects.states, (a, b) => a !== b)

  fs.writeFileSync(
    path.join(MAP_DIR, `${slug}-land.svg`),
    svg(width, height, `<path d="${project(land)}"/>`),
  )
  fs.writeFileSync(
    path.join(MAP_DIR, `${slug}-lines.svg`),
    svg(
      width,
      height,
      `<g fill="none" stroke="#000" stroke-linejoin="round">` +
        `<path stroke-width="1.1" d="${project(coast)}"/>` +
        `<path stroke-width="1" d="${project(countryLines)}"/>` +
        (config.zoom > 4
          ? `<path stroke-width="0.8" stroke-dasharray="4 3" d="${project(stateLines)}"/>`
          : '') +
        `</g>`,
    ),
  )

  const step = config.zoom >= 7 ? 4 : 2
  const { grid, cols, rows } = await elevationGrid(frame, step)
  let max = 0
  for (const value of grid) max = Math.max(max, value)
  const thresholds = []
  for (let level = config.interval; level < max; level += config.interval) thresholds.push(level)
  const scale = geoPath().digits(1)
  const minor = []
  const major = []
  for (const shape of contours().size([cols, rows]).thresholds(thresholds)(grid)) {
    const scaled = {
      type: 'MultiPolygon',
      // Rings this short are specks at map scale; they add bytes, not terrain.
      coordinates: shape.coordinates
        .map(polygon =>
          polygon
            .filter(ring => ring.length >= 12)
            .map(ring => ring.map(([x, y]) => [x * step, y * step])),
        )
        .filter(polygon => polygon.length > 0),
    }
    const d = scale(scaled)
    if (!d) continue
    ;(Math.round(shape.value / config.interval) % config.index === 0 ? major : minor).push(d)
  }
  fs.writeFileSync(
    path.join(MAP_DIR, `${slug}-contours.svg`),
    svg(
      width,
      height,
      `<g fill="none" stroke="#000" stroke-linejoin="round">` +
        `<path stroke-width="0.6" stroke-opacity="0.55" d="${minor.join('')}"/>` +
        `<path stroke-width="0.9" d="${major.join('')}"/>` +
        `</g>`,
    ),
  )

  const sizes = ['land', 'lines', 'contours'].map(layer => {
    const bytes = fs.statSync(path.join(MAP_DIR, `${slug}-${layer}.svg`)).size
    return `${layer} ${Math.round(bytes / 1024)} KB`
  })
  console.log(
    `${slug}: ${width}x${height}, ${thresholds.length} contour levels; ${sizes.join(', ')}`,
  )
  return frame
}

const slugs = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(CHAPTERS)
fs.mkdirSync(MAP_DIR, { recursive: true })
const frames = fs.existsSync(FRAMES_FILE) ? JSON.parse(fs.readFileSync(FRAMES_FILE, 'utf8')) : {}
for (const slug of slugs) {
  if (!CHAPTERS[slug]) throw new Error(`Unknown chapter: ${slug}`)
  frames[slug] = await build(slug)
}
fs.writeFileSync(FRAMES_FILE, `${JSON.stringify(frames, null, 2)}\n`)
