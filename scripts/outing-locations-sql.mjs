#!/usr/bin/env node
/**
 * Turns located outings into SQL for climb_locations, after checking each point
 * lands in the outing's state or country.
 *
 * Inputs: the outing list (GET /api/climbs/options) and the output of the
 * photo-locations skill's locate.py, which gives each outing a coordinate from
 * Apple Photos.
 *
 *   node scripts/outing-locations-sql.mjs outings.json located.json > locations.sql
 *
 * Inserts use ON CONFLICT DO NOTHING, so rerunning never overwrites a location
 * that was already reviewed or corrected by hand. Mismatches print to stderr;
 * outings that miss their state are left out of the SQL. Coastal outings can
 * show up as "ocean" because the outlines are coarse; check those by hand and
 * add them with --include.
 */
import fs from 'node:fs'
import { geoContains } from 'd3-geo'
import { feature } from 'topojson-client'
import us from 'us-atlas/states-10m.json' with { type: 'json' }
import world from 'world-atlas/countries-50m.json' with { type: 'json' }

const args = process.argv.slice(2)
const includeIndex = args.indexOf('--include')
const include = new Set(includeIndex === -1 ? [] : args.splice(includeIndex, 2)[1].split(','))
const [outingsFile, locatedFile] = args
if (!outingsFile || !locatedFile) {
  console.error('Usage: node scripts/outing-locations-sql.mjs outings.json located.json [--include id,id] > locations.sql')
  process.exit(1)
}

const readList = file => {
  const data = JSON.parse(fs.readFileSync(file, 'utf8'))
  return Array.isArray(data) ? data : Object.values(data).find(Array.isArray)
}
const outings = new Map(readList(outingsFile).map(outing => [outing.id, outing]))
const located = readList(locatedFile)

const states = feature(us, us.objects.states).features
const countries = feature(world, world.objects.countries).features
const normalize = value =>
  (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f\u02bb]/g, '')
    .trim()
    .toLowerCase()
const regionAt = (longitude, latitude) =>
  states.find(shape => geoContains(shape, [longitude, latitude]))?.properties.name ??
  countries.find(shape => geoContains(shape, [longitude, latitude]))?.properties.name ??
  'ocean'

const rows = []
for (const row of located) {
  const outing = outings.get(row.id)
  if (!outing) continue
  const found = regionAt(row.longitude, row.latitude)
  if (normalize(found) !== normalize(outing.state) && !include.has(row.id)) {
    console.error(`skipped ${row.id} ${outing.date?.slice(0, 10)} ${outing.title}: expected ${outing.state}, landed in ${found}`)
    continue
  }
  if (row.shared_date) console.error(`check ${outing.title}: shares its date with another outing, so they share a pin`)
  rows.push(`('${row.id.replace(/'/g, "''")}', ${row.latitude}, ${row.longitude}, 'apple-photos')`)
}

if (rows.length === 0) {
  console.error('nothing to insert')
  process.exit(0)
}
process.stdout.write(
  `INSERT INTO climb_locations (climb_id, latitude, longitude, source) VALUES\n${rows.join(',\n')}\nON CONFLICT(climb_id) DO NOTHING;\n`,
)
console.error(`${rows.length} rows written; existing locations are left as they are`)
