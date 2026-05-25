#!/usr/bin/env node
/**
 * Sync R2 objects from photos-bucket to climb-log-images
 *
 * Uses Cloudflare R2 S3-compatible API for efficient bulk copying.
 *
 * Prerequisites:
 * - AWS CLI installed and configured with R2 credentials:
 *   aws configure set region auto
 *   aws configure set aws_access_key_id <R2_ACCESS_KEY_ID>
 *   aws configure set aws_secret_access_key <R2_SECRET_ACCESS_KEY>
 *
 * Usage:
 *   npm run migrate:r2
 *
 * Or manually:
 *   aws s3 sync s3://photos-bucket s3://climb-log-images \
 *     --endpoint-url=https://<account_id>.r2.cloudflarestorage.com
 */

import { execSync } from 'child_process'

const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID || 'bb52c0e5f3a93fc72779915d7dc6982b'
const ENDPOINT = `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`

console.log('R2 Sync: photos-bucket -> climb-log-images')
console.log(`Endpoint: ${ENDPOINT}`)

// Verify AWS CLI is available
try {
  execSync('aws --version', { stdio: 'ignore' })
} catch {
  console.error('AWS CLI is required for R2 sync. Install with: pip install awscli')
  process.exit(1)
}

// Dry run first
console.log('\n--- Dry run ---')
try {
  const dryRun = execSync(
    `aws s3 sync s3://photos-bucket s3://climb-log-images --endpoint-url=${ENDPOINT} --dryrun`,
    { encoding: 'utf-8' }
  )
  console.log(dryRun || '(no changes needed)')
} catch (error) {
  console.warn('Dry run output:', error.stdout || error.message)
}

// Confirm
if (!process.argv.includes('--yes')) {
  console.log('\nRun with --yes to execute the sync:')
  console.log('  npm run migrate:r2 -- --yes')
  process.exit(0)
}

// Execute sync
console.log('\n--- Executing sync ---')
try {
  const result = execSync(
    `aws s3 sync s3://photos-bucket s3://climb-log-images --endpoint-url=${ENDPOINT}`,
    { encoding: 'utf-8' }
  )
  console.log(result || 'Sync complete!')
} catch (error) {
  console.error('Sync failed:', error.stderr || error.message)
  process.exit(1)
}

// Verify
console.log('\n--- Verifying ---')
try {
  const sourceCount = execSync(
    `aws s3 ls s3://photos-bucket --endpoint-url=${ENDPOINT} --recursive | wc -l`,
    { encoding: 'utf-8' }
  )
  const destCount = execSync(
    `aws s3 ls s3://climb-log-images --endpoint-url=${ENDPOINT} --recursive | wc -l`,
    { encoding: 'utf-8' }
  )
  console.log(`Source objects: ${sourceCount.trim()}`)
  console.log(`Dest objects: ${destCount.trim()}`)
} catch (error) {
  console.warn('Verification warning:', error.message)
}

console.log('\nR2 sync complete!')
