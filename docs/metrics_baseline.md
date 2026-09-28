# Phase 0 Baseline Metrics Report

This document establishes the performance baseline for the ASE MCP server and its underlying background processes on the Arch Linux system. All measurements were taken using rigorous benchmarking tools including Node.js benchmarking scripts and `hyperfine`.

## System Overview
- **OS**: Arch Linux
- **Model**: `Xenova/all-MiniLM-L6-v2` (for local semantic search embeddings)
- **Embedding Thread Pool**: `Piscina` worker pool
- **Database**: SQLite (`better-sqlite3`)

---

## 1. Latency Measurements

### `query_skills` Latency
Measured over 50 consecutive calls to simulate typical usage.

- **Warm Latency (TF-IDF Fallback)**:
  - **Average**: ~48.06ms
  - **p99**: ~128ms
- **Cold Latency (Semantic Search)**:
  - The first call that triggers model initialization in the worker thread takes significantly longer (approx. `681ms` just for the embedding generation portion).

### `validate_output` Latency
Measured using a dummy file payload.

- **Fast-fail Latency**: ~21ms (indicative of the overhead required to marshal the request to the Piscina pool and return an immediate validation rejection when target files are absent).

---

## 2. Background Sync Profiling (`syncSkillsBackground`)

The background sync process was profiled to understand the impact of parsing and hashing the Agent Skills Pack.

- **Full Sync (Hash Hits Only)**: 
  - **Duration**: ~26,397ms (26.4 seconds)
  - **Peak Queue Depth**: 0
  - *Observation*: Even when no embeddings are generated (due to MD5 hash cache hits), traversing the skill directory, parsing files, and running SQLite queries blocks or heavily utilizes resources for over 26 seconds on a cold file cache.
- **Single Regeneration Sync (1 file changed)**:
  - **Duration**: ~651ms
  - **Peak Queue Depth**: 0 (single task processed almost instantly)
  - *Observation*: Once the OS page cache is warm, the MD5 check is extremely fast. The bottleneck is the initial cold-cache file traversal.

---

## 3. Cold Start Performance (`hyperfine`)

We measured the absolute startup time required for the MCP server to spawn, initialize its workers, and respond to the `initialize` JSON-RPC handshake followed by a single tool invocation.

- **Minimum Initialization Time**: ~1.160s
- **Mean Time (including initial ML model load)**: 8.566s (σ: 6.414s)
- **Maximum Time (Model cold-start)**: ~12.305s

### Critical Finding: Worker Teardown Crash
During `hyperfine` testing and profiling (via `--prof`), the Node.js process frequently exits with `malloc(): unaligned tcache chunk detected` or SIGABRT (exit code 134). 
*Root Cause*: This indicates a native memory corruption issue, almost certainly a race condition during teardown between `Piscina` worker threads and `better-sqlite3`. When the server is abruptly terminated while background sync operations are active or while the V8 profiler is hooked, the SQLite extension attempts to free memory from an unaligned chunk. 
*Recommendation*: We must implement graceful teardown in the worker pool and ensure `syncSkillsBackground` queries are properly aborted or awaited on shutdown.

---

## Conclusion
The baseline numbers show that the system is heavily constrained by initial I/O during directory traversal (26s) and ML model loading (up to 12s). The worker pool teardown crash is a significant stability risk. These metrics will serve as the benchmark for all optimizations implemented in Phase 8 and beyond.
