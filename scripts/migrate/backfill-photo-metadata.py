#!/usr/bin/env python3
"""
Comprehensive photo metadata backfill script.

Fixes:
1. Dates: Strip timestamps to YYYY-MM-DD format
2. Tags: Normalize, dedupe, lowercase, sort alphabetically
3. Locations: Backfill from Notion area_fallback for photos missing area/state
4. States: Normalize to full names
5. Area names: Fix spacing inconsistencies
6. Technical metadata: Generate blurhash, accent_color, size_bytes

Usage:
  python3 scripts/migrate/backfill-photo-metadata.py --remote [--skip-images] [--phase=N]
  
  --remote: Use production database (required)
  --skip-images: Skip image processing (blurhash, accent_color, size_bytes)
  --dry-run: Preview changes without applying them
  --phase=N: Run only specific phase (1-6). Omit to run all phases.
             1=dates, 2=tags, 3=notion, 4=states, 5=spacing, 6=images
"""

import sys
import json
import subprocess
import tempfile
import os
import re
from pathlib import Path

try:
    from PIL import Image
    import numpy as np
except ImportError:
    print("❌ Missing dependencies. Install with:")
    print("   pip3 install Pillow numpy blurhash-python")
    sys.exit(1)

try:
    import blurhash
    HAS_BLURHASH = True
except ImportError:
    print("⚠️  blurhash-python not installed. Skipping blurhash generation.")
    print("   Install with: pip3 install blurhash-python")
    HAS_BLURHASH = False

# Parse args
is_remote = '--remote' in sys.argv
dry_run = '--dry-run' in sys.argv
skip_images = '--skip-images' in sys.argv

# Parse --phase=N argument
selected_phase = None
for arg in sys.argv:
    if arg.startswith('--phase='):
        try:
            selected_phase = int(arg.split('=')[1])
            if selected_phase not in [1, 2, 3, 4, 5, 6]:
                print(f"❌ Invalid phase: {selected_phase}. Must be 1-6.")
                sys.exit(1)
        except ValueError:
            print(f"❌ Invalid phase format: {arg}. Use --phase=N where N is 1-6.")
            sys.exit(1)

if not is_remote and not dry_run:
    print("❌ Must specify --remote or --dry-run")
    print("Usage: python3 backfill-photo-metadata.py --remote [--skip-images] [--dry-run] [--phase=N]")
    sys.exit(1)

print("🔄 Photo Metadata Backfill")
print(f"   Database: {'REMOTE (production)' if is_remote else 'LOCAL'}")
print(f"   Skip images: {'YES' if skip_images else 'NO'}")
if selected_phase:
    phase_names = {1: 'dates', 2: 'tags', 3: 'notion', 4: 'states', 5: 'spacing', 6: 'images'}
    print(f"   Phase: {selected_phase} ({phase_names[selected_phase]})")
else:
    print(f"   Phase: ALL")
print()

STATE_MAP = {
    'AZ': 'Arizona',
    'CA': 'California',
    'CO': 'Colorado',
    'ID': 'Idaho',
    'MT': 'Montana',
    'NM': 'New Mexico',
    'NV': 'Nevada',
    'OR': 'Oregon',
    'UT': 'Utah',
    'WA': 'Washington',
    'WY': 'Wyoming',
    'Alaska': 'Alaska',
    'Washington State': 'Washington'
}

def run_wrangler_query(query, db_flag):
    """Execute a D1 query and return results."""
    cmd = ['npx', 'wrangler', 'd1', 'execute', 'climb-log-db', db_flag, '--command', query, '--json']
    result = subprocess.run(cmd, capture_output=True, text=True, check=True, timeout=60)
    data = json.loads(result.stdout)
    return data[0].get('results', [])

def run_wrangler_update(query, db_flag):
    """Execute a D1 update statement."""
    if dry_run:
        return True
    cmd = ['npx', 'wrangler', 'd1', 'execute', 'climb-log-db', db_flag, '--command', query]
    result = subprocess.run(cmd, capture_output=True, text=True, check=True, timeout=30)
    return True

def escape_sql_string(s):
    """Escape single quotes for SQL."""
    if s is None:
        return 'NULL'
    return "'" + str(s).replace("'", "''") + "'"

def normalize_state_name(state):
    """Convert state abbreviations to full names."""
    if not state:
        return None
    trimmed = state.strip()
    return STATE_MAP.get(trimmed, trimmed)

def normalize_tags(tags):
    """Normalize tags: lowercase, trim, dedupe, sort."""
    if not tags:
        return None
    
    tag_list = [t.strip().lower() for t in tags.split(',') if t.strip()]
    unique_tags = sorted(set(tag_list))
    return ', '.join(unique_tags) if unique_tags else None

def fix_area_spacing(area):
    """Fix inconsistent spacing in area names."""
    if not area:
        return None
    # "Bridger- Teton" → "Bridger-Teton"
    return re.sub(r'\s*-\s*', '-', area).strip()

def parse_area_fallback(area_fallback):
    """Parse Notion area_fallback into area and state."""
    if not area_fallback:
        return None, None
    
    # Try comma separator first: "Area, State"
    if ',' in area_fallback:
        parts = [p.strip() for p in area_fallback.split(',', 1)]
        area = fix_area_spacing(parts[0])
        state = normalize_state_name(parts[1]) if len(parts) > 1 else None
        return area, state
    
    # Try dash separator: "Area- State" or "Area - State"
    if '-' in area_fallback and len(area_fallback.split('-')) == 2:
        parts = [p.strip() for p in area_fallback.split('-', 1)]
        # Check if second part looks like a state (short or known name)
        if len(parts[1]) <= 20 and (len(parts[1]) == 2 or parts[1] in STATE_MAP.values()):
            area = fix_area_spacing(parts[0])
            state = normalize_state_name(parts[1])
            return area, state
    
    # No separator - just area
    return fix_area_spacing(area_fallback), None

def generate_blurhash(img):
    """Generate blurhash from PIL Image."""
    if not HAS_BLURHASH:
        return 'LEHV6nWB2yk8pyo0adR*.7kCMdnj'  # neutral gray fallback
    
    img_small = img.copy()
    img_small.thumbnail((32, 32))
    if img_small.mode != 'RGB':
        img_small = img_small.convert('RGB')
    return blurhash.encode(img_small, x_components=4, y_components=3)

def extract_accent_color(img):
    """Extract dominant color from PIL Image."""
    img_color = img.copy()
    img_color.thumbnail((50, 50))
    if img_color.mode != 'RGB':
        img_color = img_color.convert('RGB')
    
    pixels = np.array(img_color)
    h, w = pixels.shape[:2]
    
    # Center-weighted mask
    y, x = np.ogrid[:h, :w]
    center_y, center_x = h/2, w/2
    distance = np.sqrt((x - center_x)**2 + (y - center_y)**2)
    max_dist = np.sqrt(center_x**2 + center_y**2)
    weights = 1 - (distance / max_dist)
    
    # Weighted average color
    r = np.average(pixels[:,:,0], weights=weights)
    g = np.average(pixels[:,:,1], weights=weights)
    b = np.average(pixels[:,:,2], weights=weights)
    
    return f"{int(r):02x}{int(g):02x}{int(b):02x}"

# ============================================================================
# PHASE 1: Fix dates with timestamps
# ============================================================================

db_flag = '--remote' if is_remote else '--local'

if selected_phase is None or selected_phase == 1:
    print("=" * 60)
    print("PHASE 1: Fix Date Timestamps")
    print("=" * 60)

    timestamp_photos = run_wrangler_query(
        "SELECT id, date FROM photos WHERE date LIKE '%T%:%'",
        db_flag
    )

    print(f"Found {len(timestamp_photos)} photos with timestamp dates")

    for photo in timestamp_photos:
        old_date = photo['date']
        new_date = old_date.split('T')[0]
        print(f"  {photo['id'][:8]}: {old_date} → {new_date}")
        
        query = f"UPDATE photos SET date = {escape_sql_string(new_date)} WHERE id = {escape_sql_string(photo['id'])}"
        run_wrangler_update(query, db_flag)

    print(f"✅ Fixed {len(timestamp_photos)} dates\n")

# ============================================================================
# PHASE 2: Normalize tags
# ============================================================================

if selected_phase is None or selected_phase == 2:
    print("=" * 60)
    print("PHASE 2: Normalize Tags")
    print("=" * 60)

    malformed_tags = run_wrangler_query(
        "SELECT id, search_tags FROM photos WHERE search_tags LIKE '%,' OR search_tags LIKE ',%' OR search_tags IS NOT NULL",
        db_flag
    )

    print(f"Checking {len(malformed_tags)} photos with tags")

    normalized_count = 0
    for photo in malformed_tags:
        old_tags = photo['search_tags']
        new_tags = normalize_tags(old_tags)
        
        if old_tags != new_tags:
            print(f"  {photo['id'][:8]}: {old_tags} → {new_tags}")
            query = f"UPDATE photos SET search_tags = {escape_sql_string(new_tags)} WHERE id = {escape_sql_string(photo['id'])}"
            run_wrangler_update(query, db_flag)
            normalized_count += 1

    print(f"✅ Normalized {normalized_count} tag entries\n")

# ============================================================================
# PHASE 3: Backfill locations from Notion
# ============================================================================

if selected_phase is None or selected_phase == 3:
    print("=" * 60)
    print("PHASE 3: Backfill Locations from Notion")
    print("=" * 60)

    missing_location = run_wrangler_query(
        "SELECT id, notion_id FROM photos WHERE area IS NULL OR state IS NULL",
        db_flag
    )

    print(f"Found {len(missing_location)} photos missing location data")
    print("Querying Notion API...")

    # Query Notion for area_fallback
    notion_token = os.getenv('NOTION_TOKEN')
    notion_db_id = os.getenv('NOTION_PHOTOS_DB_ID')

    if not notion_token or not notion_db_id:
        print("⚠️  NOTION_TOKEN or NOTION_PHOTOS_DB_ID not set. Skipping Notion query.")
        print("   Set these in .env to backfill locations from Notion.")
    else:
        import requests
        
        headers = {
            'Authorization': f'Bearer {notion_token}',
            'Notion-Version': '2022-06-28',
            'Content-Type': 'application/json'
        }
        
        backfilled = 0
        for photo in missing_location:
            # Query Notion for this photo's page
            page_id = photo['notion_id'] or photo['id']
            
            # Format page ID with dashes
            if '-' not in page_id:
                page_id = f"{page_id[:8]}-{page_id[8:12]}-{page_id[12:16]}-{page_id[16:20]}-{page_id[20:]}"
            
            try:
                response = requests.get(
                    f'https://api.notion.com/v1/pages/{page_id}',
                    headers=headers,
                    timeout=10
                )
                
                if response.status_code != 200:
                    print(f"  ⚠️  {photo['id'][:8]}: Notion API error {response.status_code}")
                    continue
                
                page_data = response.json()
                area_fallback = page_data.get('properties', {}).get('area_fallback', {}).get('rich_text', [])
                
                if area_fallback and len(area_fallback) > 0:
                    area_text = area_fallback[0].get('plain_text', '')
                    area, state = parse_area_fallback(area_text)
                    
                    if area or state:
                        print(f"  {photo['id'][:8]}: {area_text} → area={area}, state={state}")
                        
                        updates = []
                        if area:
                            updates.append(f"area = {escape_sql_string(area)}")
                        if state:
                            updates.append(f"state = {escape_sql_string(state)}")
                        
                        if updates:
                            query = f"UPDATE photos SET {', '.join(updates)} WHERE id = {escape_sql_string(photo['id'])}"
                            run_wrangler_update(query, db_flag)
                            backfilled += 1
            
            except Exception as e:
                print(f"  ✗ {photo['id'][:8]}: Error - {e}")
        
        print(f"✅ Backfilled {backfilled} locations from Notion\n")

# ============================================================================
# PHASE 4: Normalize existing state names
# ============================================================================

if selected_phase is None or selected_phase == 4:
    print("=" * 60)
    print("PHASE 4: Normalize State Names")
    print("=" * 60)

    photos_with_states = run_wrangler_query(
        "SELECT id, state FROM photos WHERE state IS NOT NULL",
        db_flag
    )

    print(f"Checking {len(photos_with_states)} photos with state data")

    normalized_states = 0
    for photo in photos_with_states:
        old_state = photo['state']
        new_state = normalize_state_name(old_state)
        
        if old_state != new_state:
            print(f"  {photo['id'][:8]}: {old_state} → {new_state}")
            query = f"UPDATE photos SET state = {escape_sql_string(new_state)} WHERE id = {escape_sql_string(photo['id'])}"
            run_wrangler_update(query, db_flag)
            normalized_states += 1

    print(f"✅ Normalized {normalized_states} state names\n")

# ============================================================================
# PHASE 5: Fix area spacing
# ============================================================================

if selected_phase is None or selected_phase == 5:
    print("=" * 60)
    print("PHASE 5: Fix Area Spacing")
    print("=" * 60)

    photos_with_area = run_wrangler_query(
        "SELECT id, area FROM photos WHERE area LIKE '% - %' OR area LIKE '% -%' OR area LIKE '%- %'",
        db_flag
    )

    print(f"Found {len(photos_with_area)} photos with spacing issues in area")

    fixed_areas = 0
    for photo in photos_with_area:
        old_area = photo['area']
        new_area = fix_area_spacing(old_area)
        
        if old_area != new_area:
            print(f"  {photo['id'][:8]}: {old_area} → {new_area}")
            query = f"UPDATE photos SET area = {escape_sql_string(new_area)} WHERE id = {escape_sql_string(photo['id'])}"
            run_wrangler_update(query, db_flag)
            fixed_areas += 1

    print(f"✅ Fixed {fixed_areas} area names\n")

# ============================================================================
# PHASE 6: Generate technical metadata
# ============================================================================

if (selected_phase is None or selected_phase == 6) and not skip_images:
    print("=" * 60)
    print("PHASE 6: Generate Technical Metadata")
    print("=" * 60)
    
    photos_needing_metadata = run_wrangler_query(
        "SELECT id, short_id, r2_key FROM photos WHERE blurhash IS NULL OR accent_color IS NULL OR size_bytes IS NULL LIMIT 573",
        db_flag
    )
    
    print(f"Processing {len(photos_needing_metadata)} photos for technical metadata")
    print("This will take a while (~10 minutes for 573 photos)...\n")
    
    processed = 0
    errors = 0
    temp_dir = tempfile.gettempdir()
    
    for i, photo in enumerate(photos_needing_metadata):
        photo_id = photo['short_id'] or photo['id'][:8]
        print(f"[{i+1}/{len(photos_needing_metadata)}] {photo_id}", end=' ')
        
        temp_file = None
        try:
            # Download from R2
            r2_key = f"{photo['r2_key']}/original.jpeg"
            temp_file = os.path.join(temp_dir, f"photo-{photo['id']}.jpg")
            
            download_cmd = ['npx', 'wrangler', 'r2', 'object', 'get',
                          f"climb-log-images/{r2_key}", '--remote', '--file', temp_file]
            subprocess.run(download_cmd, capture_output=True, check=True, timeout=30)
            
            # Get file size
            size_bytes = os.path.getsize(temp_file)
            
            # Open image
            img = Image.open(temp_file)
            
            # Generate metadata
            hash_value = generate_blurhash(img)
            accent_color = extract_accent_color(img)
            
            img.close()
            
            print(f"✓ {size_bytes/1024:.1f}KB, {accent_color}, {hash_value[:16]}...")
            
            # Update database
            query = f"""UPDATE photos 
                       SET blurhash = {escape_sql_string(hash_value)}, 
                           accent_color = {escape_sql_string(accent_color)}, 
                           size_bytes = {size_bytes} 
                       WHERE id = {escape_sql_string(photo['id'])}"""
            run_wrangler_update(query, db_flag)
            
            processed += 1
            
            # Rate limiting
            if (i + 1) % 10 == 0 and i + 1 < len(photos_needing_metadata):
                import time
                time.sleep(2)
        
        except Exception as e:
            print(f"✗ {e}")
            errors += 1
        
        finally:
            if temp_file and os.path.exists(temp_file):
                os.unlink(temp_file)
    
    print(f"\n✅ Processed {processed} photos, {errors} errors\n")
else:
    print("⏭️  Skipping image processing (--skip-images)\n")

print("=" * 60)
print("✅ COMPLETE")
print("=" * 60)
if dry_run:
    print("(Dry run - no changes were saved)")
