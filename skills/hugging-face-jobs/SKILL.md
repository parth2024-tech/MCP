---
source: "https://github.com/huggingface/skills/tree/main/skills/huggingface-jobs"
name: hugging-face-jobs
description: Run workloads on Hugging Face Jobs with managed CPUs, GPUs, TPUs, secrets, and Hub persistence. Use when the task involves hugging face jobs.
license: Complete terms in LICENSE.txt
risk: unknown
---

# Running Workloads on Hugging Face Jobs

## Overview

Run any workload on fully managed Hugging Face infrastructure. No local setup required—jobs run on cloud CPUs, GPUs, or TPUs and can persist results to the Hugging Face Hub.

**Common use cases:**
- **Data Processing** - Transform, filter, or analyze large datasets
- **Batch Inference** - Run inference on thousands of samples
- **Experiments & Benchmarks** - Reproducible ML experiments
- **Model Training** - Fine-tune models (see `model-trainer` skill for TRL-specific training)
- **Synthetic Data Generation** - Generate datasets using LLMs
- **Development & Testing** - Test code without local GPU setup
- **Scheduled Jobs** - Automate recurring tasks

**For model training specifically:** See the `model-trainer` skill for TRL-based training workflows.

## When to Use This Skill

Use this skill when users want to:
- Run Python workloads on cloud infrastructure
- Execute jobs without local GPU/TPU setup
- Process data at scale
- Run batch inference or experiments
- Schedule recurring tasks
- Use GPUs/TPUs for any workload
- Persist results to the Hugging Face Hub

## Key Directives

When assisting with jobs:

1. **ALWAYS use `hf_jobs()` MCP tool** - Submit jobs using `hf_jobs("uv", {...})` or `hf_jobs("run", {...})`. The `script` parameter accepts Python code directly. Do NOT save to local files unless the user explicitly requests it. Pass the script content as a string to `hf_jobs()`.

2. **Always handle authentication** - Jobs that interact with the Hub require `HF_TOKEN` via secrets. See Token Usage section below.

3. **Provide job details after submission** - After submitting, provide job ID, monitoring URL, estimated time, and note that the user can request status checks later.

4. **Set appropriate timeouts** - Default 30min may be insufficient for long-running tasks.

## Prerequisites Checklist

Before starting any job, verify:

### ✅ **Account & Authentication**
- Hugging Face Account with [Pro](https://hf.co/pro), [Team](https://hf.co/enterprise), or [Enterprise](https://hf.co/enterprise) plan (Jobs require paid plan)
- Authenticated login: Check with `hf_whoami()`
- **HF_TOKEN for Hub Access** ⚠️ CRITICAL - Required for any Hub operations (push models/datasets, download private repos, etc.)
- Token must have appropriate permissions (read for downloads, write for uploads)

### ✅ **Token Usage** (See Token Usage section for details)

**When tokens are required:**
- Pushing models/datasets to Hub
- Accessing private repositories
- Using Hub APIs in scripts
- Any authenticated Hub operations

**How to provide tokens:**
```python
# hf_jobs MCP tool — $HF_TOKEN is auto-replaced with real token:
{"secrets": {"HF_TOKEN": "$HF_TOKEN"}}

# HfApi().run_uv_job() — MUST pass actual token:
from huggingface_hub import get_token
secrets={"HF_TOKEN": get_token()}
> See [references/details.md](references/details.md) for full code examples.
hf_jobs("uv", {
    "script": "your_script.py",
    "secrets": {"HF_TOKEN": "$HF_TOKEN"}  # ✅ Automatic replacement
})
```

**How it works:**
- `$HF_TOKEN` is a placeholder that gets replaced with your actual token
- Uses the token from your logged-in session (`hf auth login`)
- Most secure and convenient method
- Token is encrypted server-side when passed as a secret

**Benefits:**
- No token exposure in code
- Uses your current login session
- Automatically updated if you re-login
- Works seamlessly with MCP tools

#### Method 2: Explicit Token (Not Recommended)

```python
hf_jobs("uv", {
    "script": "your_script.py",
    "secrets": {"HF_TOKEN": "hf_abc123..."}  # ⚠️ Hardcoded token
})
```

**When to use:**
- Only if automatic token doesn't work
- Testing with a specific token
- Organization tokens (use with caution)

**Security concerns:**
- Token visible in code/logs
- Must manually update if token rotates
- Risk of token exposure

#### Method 3: Environment Variable (Less Secure)

```python
hf_jobs("uv", {
    "script": "your_script.py",
    "env": {"HF_TOKEN": "hf_abc123..."}  # ⚠️ Less secure than secrets
})
```

**Difference from secrets:**
- `env` variables are visible in job logs
- `secrets` are encrypted server-side
- Always prefer `secrets` for tokens

### Using Tokens in Scripts

**In your Python script, tokens are available as environment variables:**

```python
# /// script
# dependencies = ["huggingface-hub"]
# ///

import os
from huggingface_hub import HfApi

# Token is automatically available if passed via secrets
token = os.environ.get("HF_TOKEN")

# Use with Hub API
api = HfApi(token=token)

# Or let huggingface_hub auto-detect
api = HfApi()  # Automatically uses HF_TOKEN env var
```

**Best practices:**
- Don't hardcode tokens in scripts
- Use `os.environ.get("HF_TOKEN")` to access
- Let `huggingface_hub` auto-detect when possible
- Verify token exists before Hub operations

### Token Verification

**Check if you're logged in:**
```python
from huggingface_hub import whoami
user_info = whoami()  # Returns your username if authenticated
```

**Verify token in job:**
```python
import os
assert "HF_TOKEN" in os.environ, "HF_TOKEN not found!"
token = os.environ["HF_TOKEN"]
print(f"Token starts with: {token[:7]}...")  # Should start with "hf_"
> See [references/details.md](references/details.md) for full code examples.
# Example: Push results to Hub
hf_jobs("uv", {
    "script": """
# /// script
# dependencies = ["huggingface-hub", "datasets"]
# ///

import os
from huggingface_hub import HfApi
from datasets import Dataset

# Verify token is available
assert "HF_TOKEN" in os.environ, "HF_TOKEN required!"

# Use token for Hub operations
api = HfApi(token=os.environ["HF_TOKEN"])

# Create and push dataset
data = {"text": ["Hello", "World"]}
dataset = Dataset.from_dict(data)
dataset.push_to_hub("username/my-dataset", token=os.environ["HF_TOKEN"])

print("✅ Dataset pushed successfully!")
""",
    "flavor": "cpu-basic",
    "timeout": "30m",
    "secrets": {"HF_TOKEN": "$HF_TOKEN"}  # ✅ Token provided securely
})
```

## Quick Start: Two Approaches

### Approach 1: UV Scripts (Recommended)

UV scripts use PEP 723 inline dependencies for clean, self-contained workloads.

**MCP Tool:**
```python
hf_jobs("uv", {
    "script": """
# /// script
# dependencies = ["transformers", "torch"]
# ///

from transformers import pipeline
import torch

# Your workload here
classifier = pipeline("sentiment-analysis")
result = classifier("I love Hugging Face!")
print(result)
""",
    "flavor": "cpu-basic",
    "timeout": "30m"
})
```

**CLI Equivalent:**
```bash
hf jobs uv run my_script.py --flavor cpu-basic --timeout 30m
```

**Python API:**
```python
from huggingface_hub import run_uv_job
run_uv_job("my_script.py", flavor="cpu-basic", timeout="30m")
```

**Benefits:** Direct MCP tool usage, clean code, dependencies declared inline, no file saving required

**When to use:** Default choice for all workloads, custom logic, any scenario requiring `hf_jobs()`

#### Custom Docker Images for UV Scripts

By default, UV scripts use `ghcr.io/astral-sh/uv:python3.12-bookworm-slim`. For ML workloads with complex dependencies, use pre-built images:

```python
hf_jobs("uv", {
    "script": "inference.py",
    "image": "vllm/vllm-openai:latest",  # Pre-built image with vLLM
    "flavor": "a10g-large"
})
```

**CLI:**
```bash
hf jobs uv run --image vllm/vllm-openai:latest --flavor a10g-large inference.py
```

**Benefits:** Faster startup, pre-installed dependencies, optimized for specific frameworks

#### Python Version

By default, UV scripts use Python 3.12. Specify a different version:

```python
hf_jobs("uv", {
    "script": "my_script.py",
    "python": "3.11",  # Use Python 3.11
    "flavor": "cpu-basic"
})
```

**Python API:**
```python
from huggingface_hub import run_uv_job
run_uv_job("my_script.py", python="3.11")
```

#### Working with Scripts

⚠️ **Important:** There are *two* "script path" stories depending on how you run Jobs:

- **Using the `hf_jobs()` MCP tool (recommended in this repo)**: the `script` value must be **inline code** (a string) or a **URL**. A local filesystem path (like `"./scripts/foo.py"`) won't exist inside the remote container.
- **Using the `hf jobs uv run` CLI**: local file paths **do work** (the CLI uploads your script).

**Common mistake with `hf_jobs()` MCP tool:**

```python
# ❌ Will fail (remote container can't see your local path)
hf_jobs("uv", {"script": "./scripts/foo.py"})
```

**Correct patterns with `hf_jobs()` MCP tool:**

```python
# ✅ Inline: read the local script file and pass its *contents*
from pathlib import Path
script = Path("hf-jobs/scripts/foo.py").read_text()
hf_jobs("uv", {"script": script})

# ✅ URL: host the script somewhere reachable
hf_jobs("uv", {"script": "https://huggingface.co/datasets/uv-scripts/.../raw/main/foo.py"})

# ✅ URL from GitHub
hf_jobs("uv", {"script": "https://raw.githubusercontent.com/huggingface/trl/main/trl/scripts/sft.py"})
```

**CLI equivalent (local paths supported):**

```bash
hf jobs uv run ./scripts/foo.py -- --your --args
```

#### Adding Dependencies at Runtime

Add extra dependencies beyond what's in the PEP 723 header:

```python
hf_jobs("uv", {
    "script": "inference.py",
    "dependencies": ["transformers", "torch>=2.0"],  # Extra deps
    "flavor": "a10g-small"
})
```

**Python API:**
```python
from huggingface_hub import run_uv_job
run_uv_job("inference.py", dependencies=["transformers", "torch>=2.0"])
```

### Approach 2: Docker-Based Jobs

Run jobs with custom Docker images and commands.

**MCP Tool:**
```python
hf_jobs("run", {
    "image": "python:3.12",
    "command": ["python", "-c", "print('Hello from HF Jobs!')"],
    "flavor": "cpu-basic",
    "timeout": "30m"
})
```

**CLI Equivalent:**
```bash
hf jobs run python:3.12 python -c "print('Hello from HF Jobs!')"
```

**Python API:**
```python
from huggingface_hub import run_job
run_job(image="python:3.12", command=["python", "-c", "print('Hello!')"], flavor="cpu-basic")
```

**Benefits:** Full Docker control, use pre-built images, run any command
**When to use:** Need specific Docker images, non-Python workloads, complex environments

**Example with GPU:**
```python
hf_jobs("run", {
    "image": "pytorch/pytorch:2.6.0-cuda12.4-cudnn9-devel",
    "command": ["python", "-c", "import torch; print(torch.cuda.get_device_name())"],
    "flavor": "a10g-small",
    "timeout": "1h"
})
```

**Using Hugging Face Spaces as Images:**

You can use Docker images from HF Spaces:
```python
hf_jobs("run", {
    "image": "hf.co/spaces/lhoestq/duckdb",  # Space as Docker image
    "command": ["duckdb", "-c", "SELECT 'Hello from DuckDB!'"],
    "flavor": "cpu-basic"
})
```

**CLI:**
```bash
hf jobs run hf.co/spaces/lhoestq/duckdb duckdb -c "SELECT 'Hello!'"
```

### Finding More UV Scripts on Hub

The `uv-scripts` organization provides ready-to-use UV scripts stored as datasets on Hugging Face Hub:

```python
# Discover available UV script collections
dataset_search({"author": "uv-scripts", "sort": "downloads", "limit": 20})

# Explore a specific collection
hub_repo_details(["uv-scripts/classification"], repo_type="dataset", include_readme=True)
> See [references/details.md](references/details.md) for full code examples.
# Push models
model.push_to_hub("username/model-name", token=os.environ["HF_TOKEN"])

# Push datasets
dataset.push_to_hub("username/dataset-name", token=os.environ["HF_TOKEN"])

# Push artifacts
api.upload_file(
    path_or_fileobj="results.json",
    path_in_repo="results.json",
    repo_id="username/results",
    token=os.environ["HF_TOKEN"]
)
```

**2. Use External Storage**

```python
# Upload to S3, GCS, etc.
import boto3
s3 = boto3.client('s3')
s3.upload_file('results.json', 'my-bucket', 'results.json')
```

**3. Send Results via API**

```python
# POST results to your API
import requests
requests.post("https://your-api.com/results", json=results)
```

### Required Configuration for Hub Push

**In job submission:**
```python
# hf_jobs MCP tool:
{"secrets": {"HF_TOKEN": "$HF_TOKEN"}}  # auto-replaced

# HfApi().run_uv_job():
from huggingface_hub import get_token
secrets={"HF_TOKEN": get_token()}  # must pass real token
```

**In script:**
```python
import os
from huggingface_hub import HfApi

# Token automatically available from secrets
api = HfApi(token=os.environ.get("HF_TOKEN"))

# Push your results
api.upload_file(...)
> See [references/details.md](references/details.md) for full code examples.
{
    "timeout": "2h"   # 2 hours
}
```

**Supported formats:**
- Integer/float: seconds (e.g., `300` = 5 minutes)
- String with suffix: `"5m"` (minutes), `"2h"` (hours), `"1d"` (days)
- Examples: `"90m"`, `"2h"`, `"1.5h"`, `300`, `"1d"`

**Python API:**
```python
from huggingface_hub import run_job, run_uv_job

run_job(image="python:3.12", command=[...], timeout="2h")
run_uv_job("script.py", timeout=7200)  # 2 hours in seconds
Total Cost = (Hours of runtime) × (Cost per hour)
# List all jobs
hf_jobs("ps")

# Inspect specific job
hf_jobs("inspect", {"job_id": "your-job-id"})

# View logs
hf_jobs("logs", {"job_id": "your-job-id"})

# Cancel a job
hf_jobs("cancel", {"job_id": "your-job-id"})
```

**Python API:**
```python
from huggingface_hub import list_jobs, inspect_job, fetch_job_logs, cancel_job

# List your jobs
jobs = list_jobs()

# List running jobs only
running = [j for j in list_jobs() if j.status.stage == "RUNNING"]

# Inspect specific job
job_info = inspect_job(job_id="your-job-id")

# View logs
for log in fetch_job_logs(job_id="your-job-id"):
