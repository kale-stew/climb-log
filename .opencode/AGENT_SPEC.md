# Climb-Log Agent Implementation Specification

> **Status:** Ready for Implementation  
> **Created:** May 2026  
> **Branch:** `feature/agent-implementation`

## Executive Summary

Build a CMD+K-invokable conversational agent for kylies.photos that helps users discover hikes, locations, gear recommendations, and photos. The agent uses Cloudflare infrastructure (Agents SDK, Durable Objects, Vectorize, Workers AI) and leverages existing D1 data, R2 storage, and blog content.

### Key Features

- Anonymous by default with optional sign-in to save conversations
- 3 voice personalities (blog, casual, technical) selectable by user
- Fresh conversation per CMD+K open
- Rate limiting with Cloudflare Turnstile challenge
- Semantic photo search via Vectorize
- Blog post full-text search
- Rich detail pages for climbs, peaks, gear with Notion body integration
- Individual photo pages (`/photos/[id]`)
- Gear purchase intelligence without affiliate links

### Cost Estimate

| Service                               | Monthly Cost     |
| ------------------------------------- | ---------------- |
| Workers Paid Plan (minimum)           | $5.00            |
| Workers AI (Llama 3.1 8B - free tier) | $0.00            |
| BGE embeddings                        | ~$0.01           |
| Vectorize (free tier)                 | $0.00            |
| **Total**                             | **~$5.01/month** |

### Timeline

- **Week 1:** Detail pages + Notion body sync
- **Week 2:** Agent core + semantic search + Turnstile
- **Week 3:** Photo pages + auth + conversation saver
- **Week 4:** Polish + deploy + monitor

---

## Architecture

```
User (CMD+K)
    │
    ▼
React Modal (VoiceSelector)
    │
    ▼
API Route (/api/agent/[id].ts)
    │
    ▼
ClimbLogAgent (Durable Object)
    │
    ▼
Tools (callable methods)
    ├──► D1 (climbs, peaks, gear, photos, blog_posts)
    ├──► Vectorize (semantic photo search)
    ├──► Workers AI (embeddings, LLM)
    └──► Photos API (images, metadata)
    │
    ▼
Structured Response (text + sources)
    │
    ▼
UI Rendering (markdown + rich cards)
```

---

## Core Decisions

### Model Selection

**Primary:** `@cf/meta/llama-3.1-8b-instruct-fast`

- 128K context window
- Function calling support — **re-verify the "Function calling" badge on the model page**;
  required for AI SDK `tool()` calls via `workers-ai-provider`
- Likely free tier
- Sufficient for RAG-based Q&A
- Newer alternatives if quality/tool-calling is lacking: `@cf/zai-org/glm-4.7-flash`
  (docs' default chat example), `@cf/google/gemma-4-26b-a4b-it`, `@cf/meta/llama-4-scout-17b-16e-instruct`

**Fallback options (if needed):**

- `@cf/meta/llama-3.3-70b-instruct-fp8-fast` - Better quality, $15/1K queries
- `@cf/openrouter/moonshotai/kimi-k2.6` - 262K context, higher cost

**Configuration for easy switching:**

```typescript
// src/lib/agent-config.ts
export const AGENT_CONFIG = {
  model: '@cf/meta/llama-3.1-8b-instruct-fast',
  contextWindow: 128000,
  maxTokens: 4096,
  temperature: 0.7,
} as const
```

Environment variable override: `AGENT_MODEL`

### User Identity

- **Default:** Anonymous sessions (no login required)
- **Enhanced:** After first chat, show "Save this conversation?" modal
  - If yes → prompt Cloudflare Access JWT sign-in
  - Saved conversations stored in DO state with user ID

### Voice Options

Three personalities selectable via dropdown:

1. **Blog Voice (Default)** - Personal, reflective, educational
2. **Casual/Friendly** - Enthusiastic, encouraging, conversational
3. **Technical/Informative** - Data-focused, safety-oriented, concise

Stored in localStorage, passed to agent via API request.

### Rate Limiting

- **Soft limit:** 10 queries/hour per IP
- **Challenge:** Cloudflare Turnstile when limit hit
- **On success:** Reset counter for 1 hour
- **Implementation:** Atomic SQL in Durable Object (no race conditions)
- **Server-side verification required:** the widget token must be validated server-side via
  `POST https://challenges.cloudflare.com/turnstile/v0/siteverify` with the secret key
  (stored as a `wrangler secret`, e.g. `TURNSTILE_SECRET`) before resetting the counter.
  The client widget alone is not sufficient.

### Photo Detail Pages

**Route:** `/photos/[id]` (NOT query params)

**Benefits:**

- SEO-friendly URLs
- Shareable photo links
- Consistent with climb/peak/gear pages
- Proper OG meta tags per photo

### Gear Purchase Intelligence

- Parse retailer from existing `gear.url` field
- Display "Purchased from: {retailer}" on gear pages
- NO purchase links or affiliate codes
- Agent knows retailer context for recommendations

---

## File Structure

```
climb-log/
├── src/
│   ├── agents/
│   │   ├── ClimbLogAgent.ts          # Main agent Durable Object
│   │   └── types.ts                  # ToolResponse, Source types
│   ├── components/
│   │   ├── AgentModal.tsx            # CMD+K modal
│   │   ├── VoiceSelector.tsx         # Voice dropdown
│   │   ├── ConversationSaver.tsx     # Save conversation modal
│   │   ├── NotionContent.tsx         # Notion block renderer
│   │   ├── SourceCard.tsx            # Source display component
│   │   └── TurnstileChallenge.tsx    # Rate limit challenge
│   ├── pages/
│   │   ├── climbs/
│   │   │   └── [slug].astro          # Individual climb pages
│   │   ├── peaks/
│   │   │   └── [slug].astro          # Individual peak pages
│   │   ├── gear/
│   │   │   └── [id].astro            # Individual gear pages
│   │   ├── photos/
│   │   │   └── [id].astro            # Individual photo pages
│   │   ├── admin/
│   │   │   └── sync.astro            # Sync dashboard
│   │   └── api/
│   │       ├── agent/
│   │       │   ├── [id].ts           # Agent endpoint
│   │       │   └── conversations.ts  # Saved chats (JWT required)
│   │       └── admin/
│   │           ├── sync-bodies.ts    # Refresh Notion bodies
│   │           └── sync-body/
│   │               └── [type]/[id].ts # Refresh single item
│   └── lib/
│       ├── agent-config.ts           # Model configuration
│       ├── agent-voices.ts           # System prompt templates
│       ├── rate-limiter.ts           # Rate limit utilities
│       └── source-utils.ts           # Dedup, format sources
├── scripts/
│   ├── backfill-embeddings.ts        # Vectorize backfill (batched)
│   ├── backfill-slugs.ts             # Generate slugs for peaks/gear
│   ├── parse-gear-retailers.ts       # Extract retailer from URLs
│   └── index-blog-posts.ts           # Blog → D1 indexer
└── migrations/
    ├── 0006_notion_body_sync.sql     # Add body columns + indexes
    ├── 0007_gear_retailer.sql        # Add retailer intelligence
    └── 0008_blog_posts_index.sql     # Blog search with FTS5 triggers
```

---

## Schema Migrations

### 0006_notion_body_sync.sql

```sql
-- Notion body columns for all content tables
ALTER TABLE climbs ADD COLUMN notion_body TEXT;
ALTER TABLE climbs ADD COLUMN notion_body_synced_at TEXT;

ALTER TABLE peaks ADD COLUMN notion_body TEXT;
ALTER TABLE peaks ADD COLUMN notion_body_synced_at TEXT;
ALTER TABLE peaks ADD COLUMN slug TEXT;

ALTER TABLE gear ADD COLUMN notion_body TEXT;
ALTER TABLE gear ADD COLUMN notion_body_synced_at TEXT;
ALTER TABLE gear ADD COLUMN slug TEXT;

-- Indexes for sync queries
CREATE INDEX idx_climbs_notion_id ON climbs(notion_id);
CREATE INDEX idx_peaks_notion_id ON peaks(notion_id);
CREATE INDEX idx_peaks_slug ON peaks(slug);
CREATE INDEX idx_gear_notion_id ON gear(notion_id);
CREATE INDEX idx_gear_slug ON gear(slug);
```

### 0007_gear_retailer.sql

```sql
-- Retailer intelligence
ALTER TABLE gear ADD COLUMN retailer TEXT;
ALTER TABLE gear ADD COLUMN url_parsed_at TEXT;

CREATE INDEX idx_gear_retailer ON gear(retailer);
```

### 0008_blog_posts_index.sql

```sql
-- Blog post search table
CREATE TABLE blog_posts (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  content_text TEXT,
  tags TEXT,
  date TEXT,
  slug TEXT UNIQUE
);

-- FTS5 virtual table (content table mode)
CREATE VIRTUAL TABLE blog_posts_fts USING fts5(
  title, content_text, tags,
  content=blog_posts
);

-- REQUIRED triggers for content table mode
CREATE TRIGGER blog_posts_fts_insert AFTER INSERT ON blog_posts BEGIN
  INSERT INTO blog_posts_fts(rowid, title, content_text, tags)
  VALUES (new.rowid, new.title, new.content_text, new.tags);
END;

CREATE TRIGGER blog_posts_fts_delete AFTER DELETE ON blog_posts BEGIN
  INSERT INTO blog_posts_fts(blog_posts_fts, rowid, title, content_text, tags)
  VALUES ('delete', old.rowid, old.title, old.content_text, old.tags);
END;

CREATE TRIGGER blog_posts_fts_update AFTER UPDATE ON blog_posts BEGIN
  INSERT INTO blog_posts_fts(blog_posts_fts, rowid, title, content_text, tags)
  VALUES ('delete', old.rowid, old.title, old.content_text, old.tags);
  INSERT INTO blog_posts_fts(rowid, title, content_text, tags)
  VALUES (new.rowid, new.title, new.content_text, new.tags);
END;
```

---

## Agent Implementation

> ### ⚠️ SDK Currency Notes (reviewed June 2026)
>
> The Agents SDK changed materially after this spec was first drafted (notably the
> **AI SDK v6 breaking change on 2025-12-22**). Verify against
> https://developers.cloudflare.com/agents/ before implementing Phase 2. Key deltas:
>
> 1. **`AIChatAgent` ships in `@cloudflare/ai-chat`, not `agents`.** Install:
>    `npm install @cloudflare/ai-chat agents ai workers-ai-provider zod`
> 2. **Tools are AI SDK `tool()` definitions, not hand-rolled dispatch.** Define each tool
>    on the server with `tool({ description, inputSchema: z.object({...}), execute })`,
>    pass them to `streamText({ model, messages, tools, stopWhen: stepCountIs(n) })`, and
>    return `result.toUIMessageStreamResponse()`. The model drives the agentic loop.
>    The `ToolResponse<T>`/`Source` "callable methods" framing below is superseded — keep
>    `Source` only as the shape a tool's `execute` returns for citation rendering.
> 3. **Deprecated APIs to avoid:** `convertToModelMessages()` is now **async** (`await` it);
>    `CoreMessage` → `ModelMessage`; `addToolResult()` → `addToolOutput()`; the `tools`
>    option in `useAgentChat` → `onToolCall`.
> 4. **Client hooks split:** `useAgent` from `agents/react`, but `useAgentChat` from
>    `@cloudflare/ai-chat/react`. Prefer `routeAgentRequest()` + WebSocket transport over a
>    custom `/api/agent/[id].ts` POST endpoint. **Open question:** how to mount
>    `routeAgentRequest` alongside Astro's handler on Workers — see
>    https://developers.cloudflare.com/agents/getting-started/add-to-existing-project/
> 5. **Model must carry the "Function calling" capability badge** to work with `tool()`.
>    `@cf/meta/llama-3.1-8b-instruct-fast` still exists; confirm its badge, or consider
>    newer fast options (`@cf/zai-org/glm-4.7-flash` is the docs' default chat example).
> 6. **Do NOT enable `experimentalDecorators`** in tsconfig — it breaks `@callable`.
>    (Current `tsconfig.json` extends `astro/tsconfigs/strict`, which is fine.)
> 7. **Turnstile needs server-side `siteverify`**, not just the widget — see Rate Limiting.

### Rate Limiter (Atomic SQL)

```typescript
// In ClimbLogAgent - use built-in SQL storage
async checkRateLimit(ip: string): Promise<boolean> {
  const now = Date.now();
  const cutoff = now - 60 * 60 * 1000;

  // Atomic cleanup + count in one transaction
  this.sql`DELETE FROM rate_limits WHERE ip = ${ip} AND ts < ${cutoff}`;

  const result = this.sql<{ count: number }>`
    SELECT COUNT(*) as count FROM rate_limits WHERE ip = ${ip}
  `;

  if (result[0].count >= 10) return false;

  this.sql`INSERT INTO rate_limits (ip, ts) VALUES (${ip}, ${now})`;
  return true;
}
```

### Tool Response Format

> **Superseded by SDK Currency Note #2.** With AI SDK `tool()`, the framework handles the
> request/response envelope — a tool's `execute` just returns its data. Keep `Source` below
> as the shape `execute` returns (and the agent embeds in markdown) for citation rendering;
> drop the `ToolResponse<T>` wrapper.

```typescript
interface ToolResponse<T> {
  success: boolean
  data: T
  sources: Source[]
  metadata?: Record<string, any>
}

interface Source {
  type: 'climb' | 'photo' | 'peak' | 'gear' | 'blog_post'
  id: string
  title: string
  url: string
  preview?: {
    image?: string
    description?: string
  }
  metadata?: Record<string, any>
}
```

### Agent Tools

1. **`search_climbs(query, filters)`** - Query D1 climbs table
2. **`search_photos(query, filters)`** - FTS5 search on photos
3. **`search_photos_semantic(query)`** - Vectorize semantic search
4. **`search_peaks(query, filters)`** - Query D1 peaks table
5. **`get_gear_recommendations(category, filters)`** - Query D1 gear with retailer metadata
6. **`search_blog_posts(query, category)`** - FTS5 search on blog posts
7. **`get_random_photo(filters)`** - Random photo with optional filters

### Message History Trimming

> **Verify against current persistence API.** `AIChatAgent` now persists messages itself;
> reassigning `this.messages` may not be the supported mutation path. Prefer trimming the
> array you pass into `convertToModelMessages()` (keep the persisted history intact), e.g.
> `await convertToModelMessages(this.messages.slice(-40))`.

```typescript
async onChatMessage() {
  // Trim what we send to the model, not the persisted history.
  const recent = this.messages.slice(-40); // last ~20 turns
  const modelMessages = await convertToModelMessages(recent);
  // ... streamText({ model, messages: modelMessages, tools, stopWhen: stepCountIs(n) })
}
```

---

## Notion Body Sync

### Implementation (with error isolation + pagination)

```typescript
const CONCURRENCY = 3 // Respect Notion rate limits
const VALID_TABLES = ['climbs', 'peaks', 'gear']

async function syncNotionBodies(notion, DB, table, dbId) {
  if (!VALID_TABLES.includes(table)) {
    throw new Error(`Invalid table: ${table}`)
  }

  const records = await DB.prepare(
    `SELECT notion_id FROM ${table} WHERE notion_id IS NOT NULL`
  ).all()

  // Batch with concurrency limit
  const chunks = chunk(records.results, CONCURRENCY)

  for (const batch of chunks) {
    await Promise.all(
      batch.map(async (record) => {
        try {
          let allBlocks = []
          let cursor

          // Handle pagination
          do {
            const response = await notion.blocks.children.list({
              block_id: record.notion_id,
              start_cursor: cursor,
              page_size: 100,
            })

            allBlocks.push(...response.results)
            cursor = response.has_more ? response.next_cursor : null
          } while (cursor)

          await DB.prepare(
            `UPDATE ${table} SET notion_body = ?, notion_body_synced_at = ? WHERE notion_id = ?`
          )
            .bind(JSON.stringify(allBlocks), new Date().toISOString(), record.notion_id)
            .run()
        } catch (error) {
          console.error(`Failed to sync ${table} ${record.notion_id}:`, error)
          // Continue with other records
        }
      })
    )
  }
}
```

### Admin Panel Controls

- **Refresh All Data** - Full cron sync
- **Refresh Notion Bodies Only** - Just body content
- **Refresh Single Item** - Input slug/id
- **Reindex Blog Posts** - Rebuild FTS5 index

---

## Vectorize Semantic Search

### Index Setup

```bash
# Create index BEFORE backfill
wrangler vectorize create photos-index --dimensions=768 --metric=cosine

# Create metadata index (must be before data insertion)
wrangler vectorize create-metadata-index photos-index --property-name=photo_id --type=string
```

### Batched Backfill Script

```typescript
const BATCH_SIZE = 100
const photos = await db.prepare('SELECT * FROM photos').all()

for (let i = 0; i < photos.results.length; i += BATCH_SIZE) {
  const batch = photos.results.slice(i, i + BATCH_SIZE)
  const texts = batch.map((p) =>
    [p.title, p.caption, p.search_tags, p.ai_caption].filter(Boolean).join(' ')
  )

  const { data } = await ai.run('@cf/baai/bge-base-en-v1.5', { text: texts })

  const vectors = batch.map((photo, j) => ({
    id: photo.id,
    values: data[j],
    metadata: { photo_id: photo.id },
  }))

  await vectorize.upsert(vectors)

  console.log(`Processed ${i + batch.length}/${photos.results.length} photos`)
}
```

---

## Voice Prompt Templates

### Blog Voice (Default)

```markdown
You are Kylie's climbing assistant, writing in her personal, reflective,
educational voice from kylieis.online.

Key traits:

- Share knowledge warmly with personal anecdotes
- Admit learning experiences openly ("I used to think...")
- Use specific examples from climbs (reference locations, gear, dates)
- Educational but approachable tone
- Reference personal growth and lessons learned

When describing Kylie's experiences, use "I" (e.g., "I found the Garmin
InReach invaluable during my Uncompahgre climb in October 2021").

When making recommendations, cite specific blog posts or trip reports as sources.
```

### Casual/Friendly

```markdown
You're a hiking buddy helping someone plan their next adventure in Colorado.

Key traits:

- Enthusiastic and encouraging ("That's an awesome choice!")
- Conversational language with contractions
- Focus on excitement and fun aspects
- Share tips like you're chatting over coffee

Keep responses warm and supportive, especially for beginners.
```

### Technical/Informative

```markdown
You're a professional mountain guide providing precise technical information.

Key traits:

- Concise and data-focused
- Lead with metrics (elevation, distance, gain, difficulty class)
- Emphasize safety considerations and conditions
- Use technical terminology appropriately
- Provide actionable recommendations with reasoning

Format responses with clear sections and bullet points for scannability.
```

### Purchase Intelligence Guidelines

```markdown
## Gear Purchase Intelligence

Kylie primarily purchases outdoor gear from:

- **REI**: Most frequent retailer, trusted for quality and returns
- **Direct from manufacturers**: Arc'teryx, Patagonia, Black Diamond, etc.
- **Specialty shops**: Local Colorado outdoor stores

When recommending where to buy gear:

- Mention REI as the primary recommendation
- Suggest manufacturer direct sales for brand-specific items
- DO NOT link to Amazon
- DO NOT provide affiliate links
- Focus on retailer reputation, return policies, and membership benefits
```

---

## Detail Page Layouts

### Climb Detail (`/climbs/[slug]`)

```
┌─────────────────────────────────────────┐
│ [Hero Photo]                             │
│ Green Mountain                           │
│ June 15, 2021 • Front Range, Colorado   │
└─────────────────────────────────────────┘
┌─────────────────────────────────────────┐
│ [Overview] [Photos] [Stats]              │
│                                          │
│ IF MARKDOWN TRIP REPORT EXISTS:          │
│   <Full markdown content>                │
│                                          │
│ IF NOTION BODY ALSO EXISTS:              │
│   ## Additional Notes                    │
│   <Notion blocks rendered>               │
│                                          │
│ ELSE IF ONLY NOTION BODY:                │
│   <Notion blocks rendered>               │
│                                          │
│ ELSE FALLBACK:                           │
│   Stats card + [Add notes in Notion]     │
│                                          │
│ Links: [Strava] [AllTrails]              │
└─────────────────────────────────────────┘
```

### Gear Detail (`/gear/[id]`)

```
┌─────────────────────────────────────────┐
│ Garmin InReach Mini                      │
│ Satellite Communicator                   │
│                                          │
│ Rating: ★★★★★ (5/5)                     │
│ Status: Own                              │
│ Weight: 3.5 oz                           │
│ Price Paid: $350                         │
│ Purchased from: REI                      │
│                                          │
│ Notes (from Notion):                     │
│ • Essential for solo hikes               │
│ • Battery lasts ~2 weeks                 │
│                                          │
│ Used on these climbs: [12 climbs →]     │
│                                          │
│ Related Gear:                            │
│ • SPOT Gen4 (alternative)                │
└─────────────────────────────────────────┘
```

### Photo Detail (`/photos/[id]`)

```
┌─────────────────────────────────────────┐
│ [Full resolution image]                  │
│ (click to zoom)                          │
└─────────────────────────────────────────┘
┌─────────────────────────────────────────┐
│ Summit of Green Mountain                 │
│ June 15, 2021 • Front Range, Colorado   │
│                                          │
│ Caption: The view from Stephen's Gulch...│
│                                          │
│ Tags: [14ers] [Front Range] [sunrise]   │
│                                          │
│ From climb: [Green Mountain →]           │
│                                          │
│ EXIF: Sony A7R IV • 24mm • f/8 • ISO 100│
│                                          │
│ [← Previous] [Next →]                    │
└─────────────────────────────────────────┘
```

---

## Retailer Parsing

### Known Retailers

```typescript
const KNOWN_RETAILERS: Record<string, { name: string; type: string; trust: string }> = {
  'rei.com': { name: 'REI', type: 'retail', trust: 'high' },
  'arcteryx.com': { name: "Arc'teryx", type: 'direct', trust: 'high' },
  'patagonia.com': { name: 'Patagonia', type: 'direct', trust: 'high' },
  'blackdiamondequipment.com': { name: 'Black Diamond', type: 'direct', trust: 'high' },
  'garmin.com': { name: 'Garmin', type: 'direct', trust: 'high' },
  'backcountry.com': { name: 'Backcountry', type: 'retail', trust: 'medium' },
  'moosejaw.com': { name: 'Moosejaw', type: 'retail', trust: 'medium' },
  'amazon.com': { name: 'Amazon', type: 'retail', trust: 'exclude' }, // never recommend
}
```

---

## wrangler.jsonc Updates

> Notes: the project already sets `"compatibility_flags": ["nodejs_compat_v2"]` (a superset of
> the docs' `nodejs_compat` — fine to keep) and already has an `"images"` binding. Workers AI
> needs an explicit `"ai": { "binding": "AI" }` binding (add it). Never edit an existing
> migration tag — add a new one.

```jsonc
{
  // ... existing config

  "ai": { "binding": "AI" },

  "durable_objects": {
    "bindings": [{ "name": "ClimbLogAgent", "class_name": "ClimbLogAgent" }],
  },

  "migrations": [{ "tag": "v1", "new_sqlite_classes": ["ClimbLogAgent"] }],

  "vectorize": {
    "bindings": [{ "binding": "VECTORIZE", "index_name": "photos-index" }],
  },

  "vars": {
    "AGENT_MODEL": "@cf/meta/llama-3.1-8b-instruct-fast",
  },
}
```

---

## Implementation Checklist

### Phase 1: Detail Pages + Notion Sync (Week 1)

#### Slug Generation

- [ ] Create `scripts/backfill-slugs.ts`
- [ ] Generate slugs for peaks
- [ ] Generate slugs for gear
- [ ] Run locally and remotely

#### Retailer Intelligence

- [ ] Create `scripts/parse-gear-retailers.ts`
- [ ] Define `KNOWN_RETAILERS` mapping
- [ ] Parse `gear.url` to extract retailer
- [ ] Run backfill script

#### Climb Detail Pages

- [ ] Create `src/pages/climbs/[slug].astro`
- [ ] Implement `getStaticPaths()` for all climbs
- [ ] Fetch climb from D1 by slug
- [ ] Check for markdown trip report
- [ ] Render trip report if exists
- [ ] Render Notion body under "Additional Notes"
- [ ] Fallback: stats card + "Add notes" link
- [ ] Query `photo_climb_links` for Photos tab
- [ ] Add Strava/AllTrails links

#### Peak Detail Pages

- [ ] Create `src/pages/peaks/[slug].astro`
- [ ] Implement `getStaticPaths()`
- [ ] Render Notion body if exists
- [ ] Query climbs that summited this peak
- [ ] Query photos tagged with peak name

#### Gear Detail Pages

- [ ] Create `src/pages/gear/[id].astro`
- [ ] Display all gear metadata
- [ ] Display "Purchased from: {retailer}"
- [ ] Render Notion body
- [ ] Check for markdown gear review
- [ ] Related gear suggestions
- [ ] NO purchase links

#### Notion Content Renderer

- [ ] Create `src/components/NotionContent.tsx`
- [ ] Handle paragraph, headings, lists
- [ ] Handle bold/italic/links
- [ ] Add CSS styling

#### Notion Body Sync

- [ ] Create `syncNotionBodies()` helper
- [ ] Error isolation per record
- [ ] Pagination handling
- [ ] Concurrency limiting (3 req/s)
- [ ] Add to daily cron

#### Admin Panel

- [ ] Create/enhance `src/pages/admin/sync.astro`
- [ ] Add refresh buttons
- [ ] Create API endpoints

### Phase 2: Agent Core + Semantic Search (Week 2)

#### Agent Setup

- [ ] Install SDK: `npm install @cloudflare/ai-chat agents ai workers-ai-provider zod`
- [ ] Create `ClimbLogAgent.ts` extending `AIChatAgent` (from `@cloudflare/ai-chat`)
- [ ] Define `Source` type in `src/agents/types.ts` (drop `ToolResponse<T>` wrapper)
- [ ] Wire `routeAgentRequest()` (resolve Astro-on-Workers mounting; see add-to-existing-project)
- [ ] Update wrangler.jsonc bindings (DO + migration; `"ai": { "binding": "AI" }` already present)

#### Agent Tools (define as AI SDK `tool()` with zod `inputSchema` + `execute`)

- [ ] `search_climbs()`
- [ ] `search_photos()` (FTS5)
- [ ] `search_photos_semantic()` (Vectorize)
- [ ] `search_peaks()`
- [ ] `get_gear_recommendations()`
- [ ] `search_blog_posts()`
- [ ] `get_random_photo()`

#### Rate Limiting

- [ ] Implement atomic SQL rate limiter
- [ ] Add Turnstile challenge component
- [ ] Integrate into agent flow

#### Voice System

- [ ] Create `src/lib/agent-voices.ts`
- [ ] Create `VoiceSelector.tsx` component
- [ ] Store in localStorage

#### Agent Modal

- [ ] Create `AgentModal.tsx`
- [ ] CMD+K keyboard listener
- [ ] Message history display
- [ ] Tool call indicators
- [ ] Source card rendering

#### Vectorize Setup

- [ ] Create index
- [ ] Create metadata index
- [ ] Build batched backfill script
- [ ] Run backfill

#### Blog Post Indexing

- [ ] Create migration with FTS5 triggers
- [ ] Create indexing script
- [ ] Run indexer

### Phase 3: Photo Pages + Auth (Week 3)

#### Photo Detail Pages

- [ ] Create `src/pages/photos/[id].astro`
- [ ] Full resolution image display
- [ ] Metadata sidebar
- [ ] EXIF data display
- [ ] Link to associated climbs
- [ ] Previous/Next navigation
- [ ] Keyboard shortcuts

#### Agent Photo URLs

- [ ] Update tools to return `/photos/{id}` URLs
- [ ] Include both thumbnail and page URLs

#### Cloudflare Access

- [ ] Create Access application
- [ ] Configure auth providers
- [ ] Set policies for admin routes
- [ ] Add optional policy for saved conversations

#### JWT Validation

- [ ] Create middleware
- [ ] Extract and verify JWT
- [ ] Extract user ID from claims

#### Conversation Saver

- [ ] Create `ConversationSaver.tsx`
- [ ] Show after first response
- [ ] Sign-in flow
- [ ] Store in DO state

#### Saved Conversations

- [ ] Create `/api/agent/conversations.ts`
- [ ] List user's saved chats
- [ ] Resume functionality

### Phase 4: Polish + Deploy (Week 4)

#### Error Handling

- [ ] Add try/catch to all tools
- [ ] Graceful degradation
- [ ] Retry logic for rate limits
- [ ] Error logging

#### Prompt Refinement

- [ ] Test diverse queries
- [ ] Tune system prompts
- [ ] Add examples
- [ ] Test edge cases

#### Citations & Sources

- [ ] Parse markdown links
- [ ] Render source cards
- [ ] Deduplicate sources
- [ ] Group by type

#### Analytics

- [ ] Track query count
- [ ] Track tool usage
- [ ] Track voice preference
- [ ] Create dashboard

#### Production Deployment

- [ ] Run all migrations
- [ ] Backfill embeddings
- [ ] Backfill blog posts
- [ ] Parse gear retailers
- [ ] Sync Notion bodies
- [ ] Test all pages
- [ ] Monitor costs

#### Documentation

- [ ] Update README
- [ ] Document tool schemas
- [ ] Document voice options
- [ ] Troubleshooting guide

---

## Success Criteria

MVP is successful when:

1. User can press CMD+K and ask questions about climbs, peaks, gear, photos
2. Agent returns accurate, helpful responses with inline citations
3. Clicking citations lands on rich detail pages with Notion content
4. Photo pages load with full metadata and navigation
5. Semantic photo search works ("colorful fall photos")
6. Blog post search works ("gear for winter 14ers")
7. Gear recommendations include retailer context without purchase links
8. Rate limiting with Turnstile prevents abuse
9. Token costs stay under $10/month
10. Agent provides helpful, on-brand responses in selected voice

---

## Review Findings (Applied)

The following issues from code review have been addressed in this spec:

1. **Rate limiter race condition** - Fixed with atomic DO SQL
2. **Vectorize backfill no batching** - Fixed with 100-photo batches
3. **Notion sync N+1 + no error isolation** - Fixed with concurrency + try/catch
4. **FTS5 missing triggers** - Added all required triggers
5. **Cost estimates wrong** - Corrected to ~$5/month with 8B model
6. **Missing notion_id indexes** - Added to migration
7. **SQL injection in table name** - Added whitelist validation
8. **Message history unbounded** - Added 40-message trimming
9. **Vectorize metadata index** - Must create before backfill
10. **Photo URL SEO** - Changed to `/photos/[id]` pages
