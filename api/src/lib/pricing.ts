/**
 * Approximate per-1M-token pricing (USD) for Anthropic Claude models.
 * Cache reads bill at ~10% of input; cache writes at ~125%.
 *
 * Source: https://anthropic.com/pricing — keep in sync when launching new models.
 */

interface ModelPrice {
  input: number;
  output: number;
}

interface UsageRow {
  model: string;
  input_tokens?: number;
  output_tokens?: number;
  cache_creation_tokens?: number;
  cache_read_tokens?: number;
}

export const PRICING: Record<string, ModelPrice> = {
  'claude-haiku-4-5':  { input: 1.00, output: 5.00 },
  'claude-sonnet-4-6': { input: 3.00, output: 15.00 },
  'claude-opus-4-7':   { input: 5.00, output: 25.00 },
};

const CACHE_WRITE_MULTIPLIER = 1.25;
const CACHE_READ_MULTIPLIER = 0.10;

/**
 * Estimate the USD cost of a single Claude call from a usage row.
 * Falls back to Haiku 4.5 pricing for unknown models so the dashboard
 * still renders something useful.
 */
export function estimateCost(row: UsageRow): number {
  const p = PRICING[row.model] || PRICING['claude-haiku-4-5'];
  const inputCost = (
    (row.input_tokens || 0) * p.input +
    (row.cache_creation_tokens || 0) * p.input * CACHE_WRITE_MULTIPLIER +
    (row.cache_read_tokens || 0) * p.input * CACHE_READ_MULTIPLIER
  ) / 1_000_000;
  const outputCost = (row.output_tokens || 0) * p.output / 1_000_000;
  return inputCost + outputCost;
}
