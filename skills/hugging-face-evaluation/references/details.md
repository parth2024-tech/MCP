# Hugging Face Evaluation — Code Reference

## ## ⚠️ CRITICAL: Check for Existing PRs Before Creating New Ones

```
Key workflow (matches CLI help):

1) `get-prs` → check for existing open PRs first
2) `inspect-tables` → find table numbers/columns  
3) `extract-readme --table N` → prints YAML by default  
4) add `--apply` (push) or `--create-pr` to write changes

# Core Capabilities

## 1. Inspect and Extract Evaluation Tables from README
- **Inspect Tables**: Use `inspect-tables` to see all tables in a README with structure, columns, and sample rows
- **Parse Markdown Tables**: Accurate parsing using markdown-it-py (ignores code blocks and examples)
- **Table Selection**: Use `--table N` to extract from a specific table (required when multiple tables exist)
- **Format Detection**: Recognize common formats (benchmarks as rows, columns, or comparison tables with multiple models)
- **Column Matching**: Automatically identify model columns/rows; prefer `--model-column-index` (index from inspect output). Use `--model-name-override` only with exact column header text.
- **YAML Generation**: Convert selected table to model-index YAML format
- **Task Typing**: `--task-type` sets the `task.type` field in model-index output (e.g., `text-generation`, `summarization`)

## 2. Import from Artificial Analysis
- **API Integration**: Fetch benchmark scores directly from Artificial Analysis
- **Automatic Formatting**: Convert API responses to model-index format
- **Metadata Preservation**: Maintain source attribution and URLs
- **PR Creation**: Automatically create pull requests with evaluation updates

## 3. Model-Index Management
- **YAML Generation**: Create properly formatted model-index entries
- **Merge Support**: Add evaluations to existing model cards without overwriting
- **Validation**: Ensure compliance with Papers with Code specification
- **Batch Operations**: Process multiple models efficiently

## 4. Run Evaluations on HF Jobs (Inference Providers)
- **Inspect-AI Integration**: Run standard evaluations using the `inspect-ai` library
- **UV Integration**: Seamlessly run Python scripts with ephemeral dependencies on HF infrastructure
- **Zero-Config**: No Dockerfiles or Space management required
- **Hardware Selection**: Configure CPU or GPU hardware for the evaluation job
- **Secure Execution**: Handles API tokens safely via secrets passed through the CLI

## 5. Run Custom Model Evaluations with vLLM (NEW)

⚠️ **Important:** This approach is only possible on devices with `uv` installed and sufficient GPU memory.
**Benefits:** No need to use `hf_jobs()` MCP tool, can run scripts directly in terminal
**When to use:** User working in local device directly  when GPU is available

### Before running the script

- check the script path
- check uv is installed
- check gpu is available with `nvidia-smi`

### Running the script

```bash


```
### Features

- **vLLM Backend**: High-performance GPU inference (5-10x faster than standard HF methods)
- **lighteval Framework**: HuggingFace's evaluation library with Open LLM Leaderboard tasks
- **inspect-ai Framework**: UK AI Safety Institute's evaluation library
- **Standalone or Jobs**: Run locally or submit to HF Jobs infrastructure

# Usage Instructions

The skill includes Python scripts in `scripts/` to perform operations.

### Prerequisites
- Preferred: use `uv run` (PEP 723 header auto-installs deps)
- Or install manually: `pip install huggingface-hub markdown-it-py python-dotenv pyyaml requests`
- Set `HF_TOKEN` environment variable with Write-access token
- For Artificial Analysis: Set `AA_API_KEY` environment variable
- `.env` is loaded automatically if `python-dotenv` is installed

### Method 1: Extract from README (CLI workflow)

Recommended flow (matches `--help`):
```bash


## ### Method 3: Run Evaluation Job

```

### Method 4: Run Custom Model Evaluation with vLLM

Evaluate custom HuggingFace models directly on GPU using vLLM or accelerate backends. These scripts are **separate from inference provider scripts** and run models locally on the job's hardware.

#### When to Use vLLM Evaluation (vs Inference Providers)

| Feature | vLLM Scripts | Inference Provider Scripts |
|---------|-------------|---------------------------|
| Model access | Any HF model | Models with API endpoints |
| Hardware | Your GPU (or HF Jobs GPU) | Provider's infrastructure |
| Cost | HF Jobs compute cost | API usage fees |
| Speed | vLLM optimized | Depends on provider |
| Offline | Yes (after download) | No |

#### Option A: lighteval with vLLM Backend

lighteval is HuggingFace's evaluation library, supporting Open LLM Leaderboard tasks.

**Standalone (local GPU):**
```bash


## # Chat/instruction-tuned models

```

**lighteval Task Format:**
Tasks use the format `suite|task|num_fewshot`:
- `leaderboard|mmlu|5` - MMLU with 5-shot
- `leaderboard|gsm8k|5` - GSM8K with 5-shot
- `lighteval|hellaswag|0` - HellaSwag zero-shot
- `leaderboard|arc_challenge|25` - ARC-Challenge with 25-shot

**Finding Available Tasks:**
The complete list of available lighteval tasks can be found at:
https://github.com/huggingface/lighteval/blob/main/examples/tasks/all_tasks.txt

This file contains all supported tasks in the format `suite|task|num_fewshot|0` (the trailing `0` is a version flag and can be ignored). Common suites include:
- `leaderboard` - Open LLM Leaderboard tasks (MMLU, GSM8K, ARC, HellaSwag, etc.)
- `lighteval` - Additional lighteval tasks
- `bigbench` - BigBench tasks
- `original` - Original benchmark tasks

To use a task from the list, extract the `suite|task|num_fewshot` portion (without the trailing `0`) and pass it to the `--tasks` parameter. For example:
- From file: `leaderboard|mmlu|0` → Use: `leaderboard|mmlu|0` (or change to `5` for 5-shot)
- From file: `bigbench|abstract_narrative_understanding|0` → Use: `bigbench|abstract_narrative_understanding|0`
- From file: `lighteval|wmt14:hi-en|0` → Use: `lighteval|wmt14:hi-en|0`

Multiple tasks can be specified as comma-separated values: `--tasks "leaderboard|mmlu|5,leaderboard|gsm8k|5"`

#### Option B: inspect-ai with vLLM Backend

inspect-ai is the UK AI Safety Institute's evaluation framework.

**Standalone (local GPU):**
```bash


## #### Option C: Python Helper Script

```bash
# Auto-detect hardware based on model size
uv run scripts/run_vllm_eval_job.py \
  --model meta-llama/Llama-3.2-1B \
  --task "leaderboard|mmlu|5" \
  --framework lighteval

# Explicit hardware selection
uv run scripts/run_vllm_eval_job.py \
  --model meta-llama/Llama-3.2-70B \
  --task mmlu \
  --framework inspect \
  --hardware a100-large \
  --tensor-parallel-size 4

# Use HF Transformers backend
uv run scripts/run_vllm_eval_job.py \
  --model microsoft/phi-2 \
  --task mmlu \
  --framework inspect \
  --backend hf
```


## ### Commands Reference

```bash
# lighteval with vLLM
hf jobs uv run scripts/lighteval_vllm_uv.py \
  --flavor "a10g-small" \
  --secrets HF_TOKEN=$HF_TOKEN \
  -- --model "model-id" \
     --tasks "leaderboard|mmlu|5"

# inspect-ai with vLLM
hf jobs uv run scripts/inspect_vllm_uv.py \
  --flavor "a10g-small" \
  --secrets HF_TOKEN=$HF_TOKEN \
  -- --model "model-id" \
     --task "mmlu"

# Helper script (auto hardware selection)
uv run scripts/run_vllm_eval_job.py \
  --model "model-id" \
  --task "leaderboard|mmlu|5" \
  --framework lighteval
```


## ### Model-Index Format

```yaml
model-index:
  - name: Model Name
    results:
      - task:
          type: text-generation
        dataset:
          name: Benchmark Dataset
          type: benchmark_type
        metrics:
          - name: MMLU
            type: mmlu
            value: 85.2
          - name: HumanEval
            type: humaneval
            value: 72.5
        source:
          name: Source Name
          url: https://source-url.com
```


## # Step 2: If no PRs, import from Artificial Analysis

```

### Troubleshooting

**Issue**: "No evaluation tables found in README"
- **Solution**: Check if README contains markdown tables with numeric scores

**Issue**: "Could not find model 'X' in transposed table"
- **Solution**: The script will display available models. Use `--model-name-override` with the exact name from the list
- **Example**: `--model-name-override "**Olmo 3-32B**"`

**Issue**: "AA_API_KEY not set"
- **Solution**: Set environment variable or add to .env file

**Issue**: "Token does not have write access"
- **Solution**: Ensure HF_TOKEN has write permissions for the repository

**Issue**: "Model not found in Artificial Analysis"
- **Solution**: Verify creator-slug and model-name match API values

**Issue**: "Payment required for hardware"
- **Solution**: Add a payment method to your Hugging Face account to use non-CPU hardware

**Issue**: "vLLM out of memory" or CUDA OOM
- **Solution**: Use a larger hardware flavor, reduce `--gpu-memory-utilization`, or use `--tensor-parallel-size` for multi-GPU

**Issue**: "Model architecture not supported by vLLM"
- **Solution**: Use `--backend hf` (inspect-ai) or `--backend accelerate` (lighteval) for HuggingFace Transformers

**Issue**: "Trust remote code required"
- **Solution**: Add `--trust-remote-code` flag for models with custom code (e.g., Phi-2, Qwen)

**Issue**: "Chat template not found"
- **Solution**: Only use `--use-chat-template` for instruction-tuned models that include a chat template

### Integration Examples

**Python Script Integration:**
```python


