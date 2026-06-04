/**
 * Backfill photo embeddings to Vectorize index
 * 
 * Run with: npx tsx scripts/backfill-embeddings.ts
 * 
 * Prerequisites:
 *   1. Run scripts/setup-vectorize.sh first
 *   2. Ensure D1 database has photos
 *   3. Configure wrangler.jsonc with Vectorize binding
 */

const BATCH_SIZE = 100;

interface Photo {
  id: string;
  title: string | null;
  caption: string | null;
  search_tags: string | null;
  ai_caption: string | null;
  exclude: number;
}

interface Env {
  DB: D1Database;
  AI: Ai;
  VECTORIZE: VectorizeIndex;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    
    if (url.pathname !== '/backfill') {
      return new Response('Use /backfill to run the embeddings backfill', { status: 200 });
    }

    try {
      const result = await backfillEmbeddings(env.DB, env.AI, env.VECTORIZE);
      return new Response(JSON.stringify(result, null, 2), {
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return new Response(JSON.stringify({ error: message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  },
};

async function backfillEmbeddings(
  db: D1Database, 
  ai: Ai, 
  vectorize: VectorizeIndex
): Promise<{ processed: number; errors: string[] }> {
  // Validate index exists before backfilling
  try {
    await vectorize.describe();
  } catch (error) {
    throw new Error(
      'Vectorize index not found. Run scripts/setup-vectorize.sh first!'
    );
  }

  const photos = await db.prepare(
    'SELECT id, title, caption, search_tags, ai_caption, exclude FROM photos WHERE exclude = 0'
  ).all<Photo>();
  
  console.log(`Found ${photos.results.length} photos to embed`);

  const errors: string[] = [];
  let processed = 0;

  for (let i = 0; i < photos.results.length; i += BATCH_SIZE) {
    const batch = photos.results.slice(i, i + BATCH_SIZE);
    
    try {
      // Build text for each photo by combining available fields
      const texts = batch.map(p => 
        [p.title, p.caption, p.search_tags, p.ai_caption]
          .filter(Boolean)
          .join(' ')
          .trim() || 'photo'  // Fallback if no text available
      );
      
      // Generate embeddings using BGE model.
      // The runtime shape is { data: number[][] }; validated below before use.
      const response = await ai.run('@cf/baai/bge-base-en-v1.5', { text: texts }) as { data: number[][] };
      
      if (!response.data || response.data.length !== batch.length) {
        throw new Error(`Embedding count mismatch: got ${response.data?.length}, expected ${batch.length}`);
      }
      
      // Build vectors for upsert
      const vectors = batch.map((photo, j) => ({
        id: photo.id,
        values: response.data[j],
        metadata: { photo_id: photo.id }
      }));

      await vectorize.upsert(vectors);
      
      processed += batch.length;
      console.log(`Processed ${processed}/${photos.results.length} photos`);
      
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      errors.push(`Batch starting at ${i}: ${message}`);
      console.error(`Error processing batch at ${i}:`, error);
    }
  }
  
  console.log(`Backfill complete! Processed: ${processed}, Errors: ${errors.length}`);
  
  return { processed, errors };
}
