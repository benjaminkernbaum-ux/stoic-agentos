/**
 * Stoic AgentOS — Embedding Service
 *
 * Generates vector embeddings for episodic memory content.
 * Uses a lightweight model (all-MiniLM-L6-v2 compatible) via
 * Supabase Edge Functions or a hosted embedding API.
 *
 * Fallback: uses keyword extraction for basic semantic search.
 */

const EMBEDDING_DIM = 384; // Matches vector(384) in schema

/**
 * Generate a pseudo-embedding from text using TF-IDF-like hashing.
 * This is a deterministic fallback when no embedding API is available.
 * Uses a hash-based approach to create consistent vector representations.
 */
export function hashEmbedding(text: string): number[] {
  const normalized = text.toLowerCase().replace(/[^\w\s]/g, '');
  const words = normalized.split(/\s+/).filter(w => w.length > 2);
  const vec = new Float64Array(EMBEDDING_DIM);

  for (const word of words) {
    // FNV-1a hash to distribute words across dimensions
    let hash = 2166136261;
    for (let i = 0; i < word.length; i++) {
      hash ^= word.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }

    // Use hash to determine dimension and direction
    const dim = Math.abs(hash) % EMBEDDING_DIM;
    const sign = (hash & 1) ? 1 : -1;
    const weight = 1 / Math.sqrt(words.length || 1); // TF normalization
    vec[dim] += sign * weight;
  }

  // L2 normalize
  let norm = 0;
  for (let i = 0; i < EMBEDDING_DIM; i++) norm += vec[i] * vec[i];
  norm = Math.sqrt(norm) || 1;
  const result: number[] = [];
  for (let i = 0; i < EMBEDDING_DIM; i++) result.push(vec[i] / norm);

  return result;
}

/**
 * Generate embeddings using an external API.
 * Supports: Supabase Edge Functions, OpenAI, or custom endpoint.
 */
export async function generateEmbedding(
  text: string,
  options: { apiKey?: string; provider?: string; model?: string } = {}
): Promise<number[]> {
  const { provider = 'hash', apiKey, model } = options;

  // Fallback: deterministic hash-based embedding
  if (provider === 'hash' || !apiKey) {
    return hashEmbedding(text);
  }

  // OpenAI embeddings
  if (provider === 'openai') {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model || 'text-embedding-3-small',
        input: text.slice(0, 8000), // Token limit safety
        dimensions: EMBEDDING_DIM,
      }),
    });

    if (!response.ok) {
      console.warn(`[Embedding] OpenAI error ${response.status}, falling back to hash`);
      return hashEmbedding(text);
    }

    const data = await response.json() as {
      data: Array<{ embedding: number[] }>;
    };
    return data.data[0]?.embedding || hashEmbedding(text);
  }

  // Default fallback
  return hashEmbedding(text);
}

/**
 * Compute cosine similarity between two vectors.
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB) || 1);
}

export { EMBEDDING_DIM };
