"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TASK_LOOPS = void 0;
exports.TASK_LOOPS = [
    {
        number: 1,
        name: "CORE_IMPLEMENTATION",
        lens: "Correctness",
        instruction: "LOOP 1 OF 5 — CORE IMPLEMENTATION\nFocus: Does this solve the problem correctly?\n- Implement the task requirement completely\n- Do not optimize, do not refactor, do not think about edge cases yet\n- Goal: working first draft only\n- Output: initial implementation artifact",
    },
    {
        number: 2,
        name: "SECURITY_HARDENING",
        lens: "Security",
        instruction: "LOOP 2 OF 5 — SECURITY HARDENING\nFocus: What can go wrong maliciously or accidentally?\n- Review loop 1 output for injection vectors, unsafe inputs, exposed secrets\n- Add input validation, sanitization, error boundaries\n- Check for: SQL injection, path traversal, prototype pollution, unhandled rejections\n- Output: security-hardened version of loop 1 artifact",
    },
    {
        number: 3,
        name: "PERFORMANCE_AND_RESILIENCE",
        lens: "Performance",
        instruction: "LOOP 3 OF 5 — PERFORMANCE & RESILIENCE\nFocus: Does this hold under load and failure?\n- Add retry logic, circuit breakers, timeout guards where applicable\n- Eliminate unnecessary awaits, redundant reads, N+1 patterns\n- Add caching where the same value is read more than once\n- Output: optimized + resilient version of loop 2 artifact",
    },
    {
        number: 4,
        name: "CODE_QUALITY",
        lens: "Maintainability",
        instruction: "LOOP 4 OF 5 — CODE QUALITY\nFocus: Can another engineer understand and extend this?\n- Apply SOLID principles, eliminate duplication\n- Rename ambiguous variables, add JSDoc on public interfaces\n- Split functions longer than 30 lines into named sub-functions\n- Ensure types are strict — no 'any', no implicit returns\n- Output: clean, documented version of loop 3 artifact",
    },
    {
        number: 5,
        name: "FINAL_INTEGRATION_AUDIT",
        lens: "Completeness",
        instruction: "LOOP 5 OF 5 — FINAL INTEGRATION AUDIT\nFocus: Does this fit perfectly into the system?\n- Verify exports match what downstream tasks expect (check shared_memory for contracts)\n- Verify never_do rules are not violated\n- Verify file lock is held before any write operations\n- Write final artifact — this output is permanent and will unlock downstream tasks\n- No further loops will run after this",
    },
];
