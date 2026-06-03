/**
 * LLM Pricing Table (USD per 1M tokens)
 * Updated May 2026 — add new models as they release
 */
export const MODEL_PRICING = {
  // OpenAI
  'gpt-4o':              { input: 2.50,  output: 10.00 },
  'gpt-4o-2024-11-20':   { input: 2.50,  output: 10.00 },
  'gpt-4o-mini':         { input: 0.15,  output: 0.60 },
  'gpt-4-turbo':         { input: 10.00, output: 30.00 },
  'gpt-4':               { input: 30.00, output: 60.00 },
  'gpt-3.5-turbo':       { input: 0.50,  output: 1.50 },
  'o1':                  { input: 15.00, output: 60.00 },
  'o1-mini':             { input: 3.00,  output: 12.00 },
  'o3':                  { input: 10.00, output: 40.00 },
  'o3-mini':             { input: 1.10,  output: 4.40 },
  'o4-mini':             { input: 1.10,  output: 4.40 },

  // Anthropic (current)
  'claude-sonnet-4-6':           { input: 3.00,  output: 15.00 },
  'claude-haiku-4-5-20251001':   { input: 1.00,  output: 5.00 },
  'claude-opus-4-8':             { input: 15.00, output: 75.00 },
  // Anthropic (legacy — kept for historical usage records)
  'claude-sonnet-4-20250514':    { input: 3.00,  output: 15.00 },
  'claude-3.5-sonnet':           { input: 3.00,  output: 15.00 },
  'claude-3-5-sonnet-20241022':  { input: 3.00,  output: 15.00 },
  'claude-3-opus':               { input: 15.00, output: 75.00 },
  'claude-3-haiku':              { input: 0.25,  output: 1.25 },
  'claude-3-5-haiku-20241022':   { input: 1.00,  output: 5.00 },

  // Google
  'gemini-2.5-pro':     { input: 1.25,  output: 10.00 },
  'gemini-2.5-flash':   { input: 0.15,  output: 0.60 },
  'gemini-2.0-flash':   { input: 0.10,  output: 0.40 },
  'gemini-1.5-pro':     { input: 1.25,  output: 5.00 },
  'gemini-1.5-flash':   { input: 0.075, output: 0.30 },
};

/**
 * Estimate cost for a given model and token usage
 * @param {string} model - Model name (e.g., 'gpt-4o')
 * @param {number} promptTokens - Input token count
 * @param {number} completionTokens - Output token count
 * @returns {number} Estimated cost in USD
 */
export function estimateCost(model, promptTokens = 0, completionTokens = 0) {
  // Try exact match, then prefix match
  let pricing = MODEL_PRICING[model];
  if (!pricing) {
    // Fuzzy match: find the longest matching prefix
    const keys = Object.keys(MODEL_PRICING);
    const match = keys
      .filter(k => model.startsWith(k) || k.startsWith(model.split('-').slice(0, 3).join('-')))
      .sort((a, b) => b.length - a.length)[0];
    pricing = match ? MODEL_PRICING[match] : null;
  }

  if (!pricing) return 0; // Unknown model

  const inputCost = (promptTokens / 1_000_000) * pricing.input;
  const outputCost = (completionTokens / 1_000_000) * pricing.output;
  return Math.round((inputCost + outputCost) * 1_000_000) / 1_000_000;
}
