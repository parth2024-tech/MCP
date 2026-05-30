/**
 * tests/context-optimizer.test.js
 *
 * Unit tests for the Cobb-Douglas context budget optimizer and parseFrontmatter.
 */

import { describe, it, expect } from 'vitest';
import { parseFrontmatter, ContextOptimizer } from '../src/utils/context-optimizer.js';

// ─────────────────────────────────────────────────────────────
// parseFrontmatter
// ─────────────────────────────────────────────────────────────
describe('parseFrontmatter', () => {
  it('returns null for content without frontmatter', () => {
    expect(parseFrontmatter('# Just a heading\n\nsome content')).toBeNull();
    expect(parseFrontmatter('')).toBeNull();
    expect(parseFrontmatter(null)).toBeNull();
  });

  it('parses a simple single-line frontmatter', () => {
    const md = `---
name: my-skill
description: A test skill for unit testing.
category: testing
risk: none
---
# Content here
`;
    const result = parseFrontmatter(md);
    expect(result).not.toBeNull();
    expect(result.name).toBe('my-skill');
    expect(result.description).toBe('A test skill for unit testing.');
    expect(result.category).toBe('testing');
    expect(result.risk).toBe('none');
  });

  it('returns null when closing --- is missing', () => {
    const md = `---
name: broken
description: Missing closing delimiter
`;
    expect(parseFrontmatter(md)).toBeNull();
  });

  it('handles frontmatter with quoted values', () => {
    const md = `---
name: "quoted-skill"
description: 'Single quoted description.'
---
body
`;
    const result = parseFrontmatter(md);
    expect(result.name).toBe('quoted-skill');
    expect(result.description).toBe('Single quoted description.');
  });

  it('parses version field', () => {
    const md = `---
name: versioned
description: Has version.
version: 2.1.0
---
`;
    const result = parseFrontmatter(md);
    expect(result.version).toBe('2.1.0');
  });
});

// ─────────────────────────────────────────────────────────────
// ContextOptimizer
// ─────────────────────────────────────────────────────────────
describe('ContextOptimizer', () => {
  it('returns empty result for empty input', () => {
    const optimizer = new ContextOptimizer();
    const { optimized, totalTokens, savedTokens } = optimizer.optimize([]);
    expect(optimized).toHaveLength(0);
    expect(totalTokens).toBe(0);
    expect(savedTokens).toBe(0);
  });

  it('includes high-relevance items', () => {
    const optimizer = new ContextOptimizer();
    const items = [
      { score: 0.95, tokenEstimate: 100, name: 'item-a' },
      { score: 0.90, tokenEstimate: 100, name: 'item-b' },
    ];
    const { optimized } = optimizer.optimize(items);
    expect(optimized.length).toBeGreaterThan(0);
    expect(optimized[0].name).toBe('item-a'); // sorted by score desc
  });

  it('cuts off low-relevance items when marginal utility is negative', () => {
    // With a huge penalty factor, even a mildly relevant item gets cut
    const optimizer = new ContextOptimizer({ penaltyFactor: 1, scaling: 1 });
    const items = [
      { score: 0.9, tokenEstimate: 1000, name: 'first' },
      { score: 0.1, tokenEstimate: 10000, name: 'second' }, // huge token cost, low score
    ];
    const { optimized, savedTokens } = optimizer.optimize(items);
    // Second item should be cut — it exceeds the budget
    expect(savedTokens).toBeGreaterThan(0);
    const names = optimized.map(i => i.name);
    expect(names).not.toContain('second');
  });

  it('calculateUtility returns 0 for zero relevance or tokens', () => {
    const optimizer = new ContextOptimizer();
    expect(optimizer.calculateUtility(0, 100, 0)).toBe(0);
    expect(optimizer.calculateUtility(0.5, 0, 0)).toBe(0);
  });

  it('calculateUtility returns positive value for valid inputs', () => {
    const optimizer = new ContextOptimizer();
    const utility = optimizer.calculateUtility(0.8, 200, 0);
    expect(utility).toBeGreaterThan(0);
  });
});
