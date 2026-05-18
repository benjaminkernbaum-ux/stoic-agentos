import { describe, it, expect } from 'vitest';
import { estimateCost, PRICING } from './pricing.js';

describe('estimateCost', () => {
  it('charges Haiku 4.5 at $1/M input, $5/M output', () => {
    const cost = estimateCost({
      model: 'claude-haiku-4-5',
      input_tokens: 1_000_000,
      output_tokens: 1_000_000,
      cache_read_tokens: 0,
      cache_creation_tokens: 0,
    });
    expect(cost).toBeCloseTo(1 + 5, 5);
  });

  it('charges Sonnet 4.6 at $3/M input, $15/M output', () => {
    const cost = estimateCost({
      model: 'claude-sonnet-4-6',
      input_tokens: 1_000_000,
      output_tokens: 1_000_000,
    });
    expect(cost).toBeCloseTo(3 + 15, 5);
  });

  it('discounts cache reads to ~10% of base input price', () => {
    const cost = estimateCost({
      model: 'claude-haiku-4-5',
      input_tokens: 0,
      output_tokens: 0,
      cache_read_tokens: 1_000_000,
    });
    expect(cost).toBeCloseTo(0.10, 5);
  });

  it('premiums cache writes at ~125% of base input price', () => {
    const cost = estimateCost({
      model: 'claude-haiku-4-5',
      input_tokens: 0,
      output_tokens: 0,
      cache_creation_tokens: 1_000_000,
    });
    expect(cost).toBeCloseTo(1.25, 5);
  });

  it('falls back to Haiku pricing for unknown models', () => {
    const cost = estimateCost({
      model: 'claude-fictional-9-9',
      input_tokens: 1_000_000,
      output_tokens: 1_000_000,
    });
    expect(cost).toBeCloseTo(1 + 5, 5);
  });

  it('treats missing token counts as zero (no NaN)', () => {
    const cost = estimateCost({ model: 'claude-haiku-4-5' });
    expect(cost).toBe(0);
  });

  it('exposes a PRICING table with the three current models', () => {
    expect(Object.keys(PRICING).sort()).toEqual([
      'claude-haiku-4-5',
      'claude-opus-4-7',
      'claude-sonnet-4-6',
    ]);
  });
});
