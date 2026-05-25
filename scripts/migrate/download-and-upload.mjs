#!/usr/bin/env node
/**
 * Download photos from Flickr (src URLs) and upload to R2.
 * 
 * For each photo in D1 that has r2_key but no corresponding R2 object,
 * downloads the src URL and uploads to R2 at photos/{id}/original.{format}.
 * 
 * Usage:
 *   node scripts/migrate/download-and-upload.mjs [--remote] [--limit=N]
 */

import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const REMOTE = process.argv.includes('--remote')
const FLAG = REMOTE ? '--remote' : '--local'

const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID || 'bb52c0e5f3a93fc72779915d7dc6982b'
const ENDPOINT = `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`

// Parse limit if provided
const limitArg = process.argv.find(a => a.startsWith('--limit='))
const LIMIT = limitArg ? parseInt(limitArg.split('=')[1], 10) : Infinity

// Check if AWS CLI is configured
function checkAwsCli() {
  try {
    execSync('aws --version', { stdio: 'ignore' })
    return true
  } catch {
    // Try the venv we installed earlier
    const venvAws = '/tmp/aws-venv/bin/aws'
    if (fs.existsSync(venvAws)) {
      return venvAws
    }
    return false
  }
}

const awsPath = checkAwsCli()
if (!awsPath) {
  console.error('AWS CLI is required. Install with: pip install awscli')
  process.exit(1)
}

function awsCommand(cmd) {
  const fullCmd = `${awsPath} ${cmd} --endpoint-url=${ENDPOINT}`
  return execSync(fullCmd, { encoding: 'utf-8' })
}

async function downloadFile(url, destPath) {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  }
  const buffer = Buffer.from(await response.arrayBuffer())
  fs.writeFileSync(destPath, buffer)
  return buffer.length
}

async function main() {
  console.log(REMOTE ? 'Remote mode' : 'Local mode')
  console.log(`AWS CLI: ${awsPath}`)
  console.log(`Limit: ${LIMIT === Infinity ? 'all' : LIMIT}`)
  console.log()

  // Step 1: Get all photos with r2_key from D1
  console.log('Fetching photos from D1...')
  const d1Result = execSync(
    `npx wrangler d1 execute DB ${FLAG} --command="SELECT id, r2_key, src, format FROM photos WHERE r2_key IS NOT NULL" --json`,
    { encoding: 'utf-8' }
  )
  const d1Data = JSON.parse(d1Result)
  const photos = (d1Data[0]?.results || []).slice(0, LIMIT)
  console.log(`  Found ${photos.length} photos with r2_key`)

  let uploaded = 0
  let skipped = 0
  let failed = 0

  // Create temp directory for downloads
  const tmpDir = fs.mkdtempSync(path.join('/tmp', 'r2-upload-'))
  console.log(`  Temp dir: ${tmpDir}`)
  console.log()

  for (let i = 0; i < photos.length; i++) {
    const photo = photos[i]
    const r2Key = `${photo.r2_key}/original.${photo.format}`

    console.log(`[${i + 1}/${photos.length}] ${photo.id} -> ${r2Key}`)

    // Check if already exists in R2
    try {
      awsCommand(`s3 ls s3://climb-log-images/${r2Key}`)
      console.log(`  ✓ Already exists in R2, skipping`)
      skipped++
      continue
    } catch {
      // Doesn't exist, proceed with download
    }

    if (!photo.src) {
      console.log(`  ✗ No src URL, skipping`)
      failed++
      continue
    }

    // Download from src URL
    const tmpFile = path.join(tmpDir, `${photo.id}.${photo.format}`)
    try {
      const size = await downloadFile(photo.src, tmpFile)
      console.log(`  ↓ Downloaded ${size} bytes from ${photo.src.substring(0, 60)}...`)
    } catch (error) {
      console.log(`  ✗ Download failed: ${error.message}`)
      failed++
      continue
    }

    // Upload to R2
    try {
      const contentType = photo.format === 'png' ? 'image/png' : 'image/jpeg'
      awsCommand(`s3 cp ${tmpFile} s3://climb-log-images/${r2Key} --content-type ${contentType}`)
      console.log(`  ↑ Uploaded to R2`)
      uploaded++
    } catch (error) {
      console.log(`  ✗ Upload failed: ${error.message}`)
      failed++
    }

    // Clean up temp file
    try {
      fs.unlinkSync(tmpFile)
    } catch {}
  }

  // Clean up temp directory
  try {
    fs.rmSync(tmpDir, { recursive: true })
  } catch {}

  console.log()
  console.log('Done!')
  console.log(`  Uploaded: ${uploaded}`)
  console.log(`  Skipped (already in R2): ${skipped}`)
  console.log(`  Failed: ${failed}`)
}

main().catch(err => {
  console.error('Script failed:', err)
  process.exit(1)
})
