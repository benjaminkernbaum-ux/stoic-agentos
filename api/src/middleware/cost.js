/**
 * ═══════════════════════════════════════════════════════
 *  Stoic AgentOS — LLM Cost Calculator
 * ═══════════════════════════════════════════════════════
 *  Static cost-per-token lookup for major LLM providers.
 *  Updated: 2026-05-17
 *
 *  Usage:
 *    calculateCost('openai', 'gpt-4o', 1200, 350)
 *    → 0.006500  (in USD)
 */

// ── Pricing Table (USD per 1M tokens) ──────────────────
// Source: provider pricing pages as of May 2026
const PRICING = {
  openai: {
    'gpt-4o':            { input: 2.50,  output: 10.00 },
    'gpt-4o-mini':       { input: 0.15,  output: 0.60  },
    'gpt-4.1':           { input: 2.00,  output: 8.00  },
    'gpt-4.1-mini':      { input: 0.40,  output: 1.60  },
    'gpt-4.1-nano':      { input: 0.10,  output: 0.40  },
    'gpt-4-turbo':       { input: 10.00, output: 30.00 },
    'gpt-3.5-turbo':     { input: 0.50,  output: 1.50  },
    'o1':                { input: 15.00, output: 60.00 },
    'o1-mini':           { input: 3.00,  output: 12.00 },
    'o1-pro':            { input: 150.00, output: 600.00 },
    'o3':                { input: 10.00, output: 40.00 },
    'o3-mini':           { input: 1.10,  output: 4.40  },
    'o4-mini':           { input: 1.10,  output: 4.40  },
  },
  anthropic: {
    'claude-opus-4':     { input: 15.00, output: 75.00 },
    'claude-sonnet-4':   { input: 3.00,  output: 15.00 },
    'claude-3.5-sonnet': { input: 3.00,  output: 15.00 },
    'claude-3.5-haiku':  { input: 0.80,  output: 4.00  },
    'claude-3-opus':     { input: 15.00, output: 75.00 },
    'claude-3-sonnet':   { input: 3.00,  output: 15.00 },
    'claude-3-haiku':    { input: 0.25,  output: 1.25  },
  },
  google: {
    'gemini-2.5-pro':    { input: 1.25,  output: 10.00 },
    'gemini-2.5-flash':  { input: 0.15,  output: 0.60  },
    'gemini-2.0-flash':  { input: 0.10,  output: 0.40  },
    'gemini-1.5-pro':    { input: 1.25,  output: 5.00  },
    'gemini-1.5-flash':  { input: 0.075, output: 0.30  },
  },
  mistral: {
    'mistral-large':     { input: 2.00,  output: 6.00  },
    'mistral-medium':    { input: 2.70,  output: 8.10  },
    'mistral-small':     { input: 0.20,  output: 0.60  },
    'codestral':         { input: 0.30,  output: 0.90  },
  },
  deepseek: {
    'deepseek-v3':       { input: 0.27,  output: 1.10  },
    'deepseek-r1':       { input: 0.55,  output: 2.19  },
  },
  cohere: {
    'command-r-plus':    { input: 2.50,  output: 10.00 },
    'command-r':         { input: 0.15,  output: 0.60  },
  },
};

// ── Fallback pricing for unknown models ──
const FALLBACK_PRICING = { input: 1.00, output: 3.00 };

/**
 * Calculate the USD cost for a single LLM call.
 *
 * @param {string} provider - e.g. 'openai', 'anthropic', 'google'
 * @param {string} model - e.g. 'gpt-4o', 'claude-sonnet-4'
 * @param {number} promptTokens - Input/prompt token count
 * @param {number} completionTokens - Output/completion token count
 * @returns {number} Cost in USD (up to 6 decimal places)
 */
export function calculateCost(provider, model, promptTokens = 0, completionTokens = 0) {
  const providerPricing = PRICING[provider?.toLowerCase()];
  const modelPricing = providerPricing?.[model?.toLowerCase()] || findFuzzyModel(providerPricing, model) || FALLBACK_PRICING;

  const inputCost = (promptTokens / 1_000_000) * modelPricing.input;
  const outputCost = (completionTokens / 1_000_000) * modelPricing.output;

  return parseFloat((inputCost + outputCost).toFixed(6));
}

/**
 * Try fuzzy-matching the model name (handles version suffixes, dates, etc.)
 * e.g. "gpt-4o-2024-08-06" → matches "gpt-4o"
 */
function findFuzzyModel(providerPricing, model) {
  if (!providerPricing || !model) return null;
  const lower = model.toLowerCase();

  // Try exact match first (already done above, but just in case)
  if (providerPricing[lower]) return providerPricing[lower];

  // Try prefix match (longest match wins)
  const keys = Object.keys(providerPricing).sort((a, b) => b.length - a.length);
  for (const key of keys) {
    if (lower.startsWith(key) || lower.includes(key)) {
      return providerPricing[key];
    }
  }

  return null;
}

/**
 * List all supported providers and models
 * @returns {Object} Provider → model list
 */
export function getSupportedModels() {
  const result = {};
  for (const [provider, models] of Object.entries(PRICING)) {
    result[provider] = Object.keys(models);
  }
  return result;
}

export default { calculateCost, getSupportedModels, PRICING };
