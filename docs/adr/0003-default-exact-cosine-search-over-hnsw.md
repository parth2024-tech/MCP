# 3. Default to Exact Brute-Force Cosine Search over HNSW for Skill Routing

Date: 2026-11-27

## Status

Accepted

## Context

`EmbeddingService` originally routed `query_skills` through `hnswlib-node` (`HierarchicalNSW('cosine', 384)`) with default index parameters (`M=16`, `efConstruction=200`, `efSearch=10`) to search ~1,500 skill embeddings (`Xenova/all-MiniLM-L6-v2`, 384 dimensions).

Across the 210-case Tier R routing benchmark (`evals/routing/cases.jsonl`), measuring HNSW against exact brute-force cosine search revealed:
- **Exact search median latency**: `1.315–1.557 ms` (`p95 = 1.545 ms`) across 1,497–1,508 normalized 384-dim float32 vectors (~2.3 MB in memory).
- **HNSW latency**: `0.107 ms` (`p95 = 0.172 ms`), saving ~1.2–1.4 ms per query.
- **HNSW vs. Exact parity**: `top1_exact_match = 0.9095` (19/210 top-1 divergences), `recall@3 = 0.9127`, `recall@10 = 0.8529`.
- **Production routing impact**: On `dev` (124 positives), HNSW dropped `hit@1` from `0.5565` (Exact) to `0.5323` and `hit@3` from `0.7742` to `0.7500` purely from missed ANN graph edges at default `efSearch`.

Because embedding inference (`Xenova/all-MiniLM-L6-v2` on CPU) dominates per-query latency (~10–25 ms), spending ~1.3 ms for exact cosine search represents a negligible latency overhead while eliminating ANN recall loss, index rebuild races, native heap lock contention (`_hnswWriteLock`), and startup graph repair logic (`_repairHnswFromSqlite`).

## Decision

1. Switch the default retrieval path in `EmbeddingService` (`search()` and `searchWithEmbedding()`) to **exact brute-force cosine similarity** (`mode: 'exact'`) sorted deterministically by `(score desc, name asc)`.
2. Retain `options.mode: 'hnsw'` behind an opt-in flag during Step 1c evaluation before proposing full removal of `hnswlib-node` in a follow-up cleanup PR.

## Consequences

### Positive
- Eliminates ANN graph approximation errors (`+2.42` percentage points `dev hit@1`, `+1.71` overall `hit@1` recovered immediately at zero API cost).
- Guarantees deterministic tie-breaking and insertion-order independence between local and CI runs.

### Neutral / Mitigations
- Brute-force cosine scales linearly `O(N * D)`; at `N = 1,508, D = 384`, exact search takes ~1.3–1.6 ms. If the corpus grows past ~25,000 skills, re-evaluate HNSW with explicitly tuned `efSearch >= 64` or partitioned search.
