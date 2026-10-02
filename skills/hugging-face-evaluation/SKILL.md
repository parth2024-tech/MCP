---
name: hugging-face-evaluation
description: Add and manage evaluation results in Hugging Face model cards. Supports extracting eval tables from README content, importing scores from Artificial Analysis API, and running custom model evaluations with vLLM/lighteval. Works with the model-index metadata format. Use when the task involves hugging face evaluation.
risk: unknown
source: community
---

# Overview
This skill provides tools to add structured evaluation results to Hugging Face model cards. It supports multiple methods for adding evaluation data:
- Extracting existing evaluation tables from README content
- Importing benchmark scores from Artificial Analysis
- Running custom model evaluations with vLLM or accelerate backends (lighteval/inspect-ai)

## When to Use
- You need to add structured evaluation results to a Hugging Face model card.
- You want to import benchmark data or run custom evaluations with vLLM, lighteval, or inspect-ai.
- You are preparing leaderboard-compatible `model-index` metadata for a model release.

## Integration with HF Ecosystem
- **Model Cards**: Updates model-index metadata for leaderboard integration
- **Artificial Analysis**: Direct API integration for benchmark imports
- **Papers with Code**: Compatible with their model-index specification
- **Jobs**: Run evaluations directly on Hugging Face Jobs with `uv` integration
- **vLLM**: Efficient GPU inference for custom model evaluation
- **lighteval**: HuggingFace's evaluation library with vLLM/accelerate backends
- **inspect-ai**: UK AI Safety Institute's evaluation framework

# Version
1.3.0

# Dependencies

## Core Dependencies
- huggingface_hub>=0.26.0
- markdown-it-py>=3.0.0
- python-dotenv>=1.2.1
- pyyaml>=6.0.3
- requests>=2.32.5
- re (built-in)

## Inference Provider Evaluation
- inspect-ai>=0.3.0
- inspect-evals
- openai

## vLLM Custom Model Evaluation (GPU required)
- lighteval[accelerate,vllm]>=0.6.0
- vllm>=0.4.0
- torch>=2.0.0
- transformers>=4.40.0
- accelerate>=0.30.0

Note: vLLM dependencies are installed automatically via PEP 723 script headers when using `uv run`.

# IMPORTANT: Using This Skill

## ⚠️ CRITICAL: Check for Existing PRs Before Creating New Ones

**Before creating ANY pull request with `--create-pr`, you MUST check for existing open PRs:**

```bash
uv run scripts/evaluation_manager.py get-prs --repo-id "username/model-name"
```

**If open PRs exist:**
1. **DO NOT create a new PR** - this creates duplicate work for maintainers
2. **Warn the user** that open PRs already exist
3. **Show the user** the existing PR URLs so they can review them
4. Only proceed if the user explicitly confirms they want to create another PR

This prevents spamming model repositories with duplicate evaluation PRs.

---

> **All paths are relative to the directory containing this SKILL.md
file.**
> Before running any script, first `cd` to that directory or use the full
path.

**Use `--help` for the latest workflow guidance.** Works with plain Python or `uv run`:
```bash
uv run scripts/evaluation_manager.py --help
uv run scripts/evaluation_manager.py inspect-tables --help
uv run scripts/evaluation_manager.py extract-readme --help
> See [references/details.md](references/details.md) for full code examples.
uv run scripts/train_sft_example.py
# 1) Inspect tables to get table numbers and column hints
uv run scripts/evaluation_manager.py inspect-tables --repo-id "username/model"

# 2) Extract a specific table (prints YAML by default)
uv run scripts/evaluation_manager.py extract-readme \
  --repo-id "username/model" \
  --table 1 \
  [--model-column-index <column index shown by inspect-tables>] \
  [--model-name-override "<column header/model name>"]  # use exact header text if you can't use the index

# 3) Apply changes (push or PR)
uv run scripts/evaluation_manager.py extract-readme \
  --repo-id "username/model" \
  --table 1 \
  --apply       # push directly
# or
uv run scripts/evaluation_manager.py extract-readme \
  --repo-id "username/model" \
  --table 1 \
  --create-pr   # open a PR
```

Validation checklist:
- YAML is printed by default; compare against the README table before applying.
- Prefer `--model-column-index`; if using `--model-name-override`, the column header text must be exact.
- For transposed tables (models as rows), ensure only one row is extracted.

### Method 2: Import from Artificial Analysis

Fetch benchmark scores from Artificial Analysis API and add them to a model card.

**Basic Usage:**
```bash
AA_API_KEY="your-api-key" uv run scripts/evaluation_manager.py import-aa \
  --creator-slug "anthropic" \
  --model-name "claude-sonnet-4" \
  --repo-id "username/model-name"
```

**With Environment File:**
```bash
# Create .env file
echo "AA_API_KEY=your-api-key" >> .env
echo "HF_TOKEN=your-hf-token" >> .env

# Run import
uv run scripts/evaluation_manager.py import-aa \
  --creator-slug "anthropic" \
  --model-name "claude-sonnet-4" \
  --repo-id "username/model-name"
```

**Create Pull Request:**
```bash
uv run scripts/evaluation_manager.py import-aa \
  --creator-slug "anthropic" \
  --model-name "claude-sonnet-4" \
  --repo-id "username/model-name" \
  --create-pr
```

### Method 3: Run Evaluation Job

Submit an evaluation job on Hugging Face infrastructure using the `hf jobs uv run` CLI.

**Direct CLI Usage:**
```bash
HF_TOKEN=$HF_TOKEN \
hf jobs uv run hf-evaluation/scripts/inspect_eval_uv.py \
  --flavor cpu-basic \
  --secret HF_TOKEN=$HF_TOKEN \
  -- --model "meta-llama/Llama-2-7b-hf" \
     --task "mmlu"
```

**GPU Example (A10G):**
```bash
HF_TOKEN=$HF_TOKEN \
hf jobs uv run hf-evaluation/scripts/inspect_eval_uv.py \
  --flavor a10g-small \
  --secret HF_TOKEN=$HF_TOKEN \
  -- --model "meta-llama/Llama-2-7b-hf" \
     --task "gsm8k"
```

**Python Helper (optional):**
```bash
uv run scripts/run_eval_job.py \
  --model "meta-llama/Llama-2-7b-hf" \
  --task "mmlu" \
  --hardware "t4-small"
> See [references/details.md](references/details.md) for full code examples.
# Run MMLU 5-shot with vLLM
uv run scripts/lighteval_vllm_uv.py \
  --model meta-llama/Llama-3.2-1B \
  --tasks "leaderboard|mmlu|5"

# Run multiple tasks
uv run scripts/lighteval_vllm_uv.py \
  --model meta-llama/Llama-3.2-1B \
  --tasks "leaderboard|mmlu|5,leaderboard|gsm8k|5"

# Use accelerate backend instead of vLLM
uv run scripts/lighteval_vllm_uv.py \
  --model meta-llama/Llama-3.2-1B \
  --tasks "leaderboard|mmlu|5" \
  --backend accelerate

# Chat/instruction-tuned models
uv run scripts/lighteval_vllm_uv.py \
  --model meta-llama/Llama-3.2-1B-Instruct \
  --tasks "leaderboard|mmlu|5" \
  --use-chat-template
```

**Via HF Jobs:**
```bash
hf jobs uv run scripts/lighteval_vllm_uv.py \
  --flavor a10g-small \
  --secrets HF_TOKEN=$HF_TOKEN \
  -- --model meta-llama/Llama-3.2-1B \
     --tasks "leaderboard|mmlu|5"
> See [references/details.md](references/details.md) for full code examples.
# Run MMLU with vLLM
uv run scripts/inspect_vllm_uv.py \
  --model meta-llama/Llama-3.2-1B \
  --task mmlu

# Use HuggingFace Transformers backend
uv run scripts/inspect_vllm_uv.py \
  --model meta-llama/Llama-3.2-1B \
  --task mmlu \
  --backend hf

# Multi-GPU with tensor parallelism
uv run scripts/inspect_vllm_uv.py \
  --model meta-llama/Llama-3.2-70B \
  --task mmlu \
  --tensor-parallel-size 4
```

**Via HF Jobs:**
```bash
hf jobs uv run scripts/inspect_vllm_uv.py \
  --flavor a10g-small \
  --secrets HF_TOKEN=$HF_TOKEN \
  -- --model meta-llama/Llama-3.2-1B \
     --task mmlu
```

**Available inspect-ai Tasks:**
- `mmlu` - Massive Multitask Language Understanding
- `gsm8k` - Grade School Math
- `hellaswag` - Common sense reasoning
- `arc_challenge` - AI2 Reasoning Challenge
- `truthfulqa` - TruthfulQA benchmark
- `winogrande` - Winograd Schema Challenge
- `humaneval` - Code generation

#### Option C: Python Helper Script

The helper script auto-selects hardware and simplifies job submission:

> See [references/details.md](references/details.md) for full code examples.

**Hardware Recommendations:**
| Model Size | Recommended Hardware |
|------------|---------------------|
| < 3B params | `t4-small` |
| 3B - 13B | `a10g-small` |
| 13B - 34B | `a10g-large` |
| 34B+ | `a100-large` |

### Commands Reference

**Top-level help and version:**
```bash
uv run scripts/evaluation_manager.py --help
uv run scripts/evaluation_manager.py --version
```

**Inspect Tables (start here):**
```bash
uv run scripts/evaluation_manager.py inspect-tables --repo-id "username/model-name"
```

**Extract from README:**
```bash
uv run scripts/evaluation_manager.py extract-readme \
  --repo-id "username/model-name" \
  --table N \
  [--model-column-index N] \
  [--model-name-override "Exact Column Header or Model Name"] \
  [--task-type "text-generation"] \
  [--dataset-name "Custom Benchmarks"] \
  [--apply | --create-pr]
```

**Import from Artificial Analysis:**
```bash
AA_API_KEY=... uv run scripts/evaluation_manager.py import-aa \
  --creator-slug "creator-name" \
  --model-name "model-slug" \
  --repo-id "username/model-name" \
  [--create-pr]
```

**View / Validate:**
```bash
uv run scripts/evaluation_manager.py show --repo-id "username/model-name"
uv run scripts/evaluation_manager.py validate --repo-id "username/model-name"
```

**Check Open PRs (ALWAYS run before --create-pr):**
```bash
uv run scripts/evaluation_manager.py get-prs --repo-id "username/model-name"
```
Lists all open pull requests for the model repository. Shows PR number, title, author, date, and URL.

**Run Evaluation Job (Inference Providers):**
```bash
hf jobs uv run scripts/inspect_eval_uv.py \
  --flavor "cpu-basic|t4-small|..." \
  --secret HF_TOKEN=$HF_TOKEN \
  -- --model "model-id" \
     --task "task-name"
```

or use the Python helper:

```bash
uv run scripts/run_eval_job.py \
  --model "model-id" \
  --task "task-name" \
  --hardware "cpu-basic|t4-small|..."
```

**Run vLLM Evaluation (Custom Models):**
> See [references/details.md](references/details.md) for full code examples.

### Model-Index Format

The generated model-index follows this structure:

> See [references/details.md](references/details.md) for full code examples.

WARNING: Do not use markdown formatting in the model name. Use the exact name from the table. Only use urls in the source.url field.

### Error Handling
- **Table Not Found**: Script will report if no evaluation tables are detected
- **Invalid Format**: Clear error messages for malformed tables
- **API Errors**: Retry logic for transient Artificial Analysis API failures
- **Token Issues**: Validation before attempting updates
- **Merge Conflicts**: Preserves existing model-index entries when adding new ones
- **Space Creation**: Handles naming conflicts and hardware request failures gracefully

### Best Practices

1. **Check for existing PRs first**: Run `get-prs` before creating any new PR to avoid duplicates
2. **Always start with `inspect-tables`**: See table structure and get the correct extraction command
3. **Use `--help` for guidance**: Run `inspect-tables --help` to see the complete workflow
4. **Preview first**: Default behavior prints YAML; review it before using `--apply` or `--create-pr`
5. **Verify extracted values**: Compare YAML output against the README table manually
6. **Use `--table N` for multi-table READMEs**: Required when multiple evaluation tables exist
7. **Use `--model-name-override` for comparison tables**: Copy the exact column header from `inspect-tables` output
8. **Create PRs for Others**: Use `--create-pr` when updating models you don't own
9. **One model per repo**: Only add the main model's results to model-index
10. **No markdown in YAML names**: The model name field in YAML should be plain text

### Model Name Matching

When extracting evaluation tables with multiple models (either as columns or rows), the script uses **exact normalized token matching**:

- Removes markdown formatting (bold `**`, links `[]()`  )
- Normalizes names (lowercase, replace `-` and `_` with spaces)
- Compares token sets: `"OLMo-3-32B"` → `{"olmo", "3", "32b"}` matches `"**Olmo 3 32B**"` or `"Olmo-3-32B`
- Only extracts if tokens match exactly (handles different word orders and separators)
- Fails if no exact match found (rather than guessing from similar names)

**For column-based tables** (benchmarks as rows, models as columns):
- Finds the column header matching the model name
- Extracts scores from that column only

**For transposed tables** (models as rows, benchmarks as columns):
- Finds the row in the first column matching the model name
- Extracts all benchmark scores from that row only

This ensures only the correct model's scores are extracted, never unrelated models or training checkpoints. 

### Common Patterns

**Update Your Own Model:**
```bash
# Extract from README and push directly
uv run scripts/evaluation_manager.py extract-readme \
  --repo-id "your-username/your-model" \
  --task-type "text-generation"
```

**Update Someone Else's Model (Full Workflow):**
```bash
# Step 1: ALWAYS check for existing PRs first
uv run scripts/evaluation_manager.py get-prs \
  --repo-id "other-username/their-model"

# Step 2: If NO open PRs exist, proceed with creating one
uv run scripts/evaluation_manager.py extract-readme \
  --repo-id "other-username/their-model" \
  --create-pr

# If open PRs DO exist:
# - Warn the user about existing PRs
# - Show them the PR URLs
# - Do NOT create a new PR unless user explicitly confirms
```

**Import Fresh Benchmarks:**
```bash
# Step 1: Check for existing PRs
uv run scripts/evaluation_manager.py get-prs \
  --repo-id "anthropic/claude-sonnet-4"

# Step 2: If no PRs, import from Artificial Analysis
AA_API_KEY=... uv run scripts/evaluation_manager.py import-aa \
  --creator-slug "anthropic" \
  --model-name "claude-sonnet-4" \
  --repo-id "anthropic/claude-sonnet-4" \
  --create-pr
> See [references/details.md](references/details.md) for full code examples.
import subprocess
import os

def update_model_evaluations(repo_id, readme_content):
    """Update model card with evaluations from README."""
    result = subprocess.run([
        "python", "scripts/evaluation_manager.py",
        "extract-readme",
        "--repo-id", repo_id,
        "--create-pr"
    ], capture_output=True, text=True)

    if result.returncode == 0:
        print(f"Successfully updated {repo_id}")
    else:
        print(f"Error: {result.stderr}")
```

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
