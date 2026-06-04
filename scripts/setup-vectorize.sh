#!/bin/bash
# scripts/setup-vectorize.sh
# Run this ONCE before backfilling embeddings
#
# IMPORTANT: The metadata index MUST be created before any data is inserted.
# This script enforces the correct order.

set -e  # Exit on any error

echo "============================================"
echo "Setting up Vectorize index for photo semantic search"
echo "============================================"
echo ""

# Step 1: Create the vector index
echo "Step 1/2: Creating photos-index..."
wrangler vectorize create photos-index --dimensions=768 --metric=cosine

echo ""

# Step 2: Create metadata index IMMEDIATELY (before any data insertion)
echo "Step 2/2: Creating metadata index (MUST be before data insertion)..."
wrangler vectorize create-metadata-index photos-index --property-name=photo_id --type=string

echo ""
echo "============================================"
echo "Vectorize setup complete!"
echo "============================================"
echo ""
echo "Next steps:"
echo "  1. Run the backfill script: npx tsx scripts/backfill-embeddings.ts"
echo "  2. Verify embeddings: wrangler vectorize info photos-index"
echo ""
