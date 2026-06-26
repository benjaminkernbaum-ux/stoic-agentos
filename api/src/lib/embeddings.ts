/**
 * Generate a 384-dimensional vector embedding for a given text using OpenAI's text-embedding-3-small.
 * If OPENAI_API_KEY is not set, returns null (graceful degradation).
 */
export async function getEmbedding(text: string): Promise<number[] | null> {
  const apiKey = process.env.OPENAI_API_KEY || '';

  if (!text || typeof text !== 'string') {
    return null;
  }

  if (!apiKey) {
    console.warn('[embeddings] OPENAI_API_KEY is not configured. Skipping embedding generation.');
    return null;
  }

  try {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        input: text.trim(),
        model: 'text-embedding-3-small',
        dimensions: 384,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error(`[embeddings] OpenAI API error: ${response.status}`, errorData);
      return null;
    }

    const result = await response.json();
    const embedding = result?.data?.[0]?.embedding;
    if (Array.isArray(embedding) && embedding.length === 384) {
      return embedding;
    }

    console.error(`[embeddings] Invalid embedding format received. Length: ${embedding?.length}`);
    return null;
  } catch (err: any) {
    console.error('[embeddings] Embedding generation failed:', err.message);
    return null;
  }
}
