---
source: "https://github.com/huggingface/skills/tree/main/skills/huggingface-vision-trainer"
name: hugging-face-vision-trainer
description: Train or fine-tune vision models on Hugging Face Jobs for detection, classification, and SAM or SAM2 segmentation. Use when the task involves hugging face vision trainer.
risk: unknown
---

# Vision Model Training on Hugging Face Jobs

Train object detection, image classification, and SAM/SAM2 segmentation models on managed cloud GPUs. No local GPU setup required—results are automatically saved to the Hugging Face Hub.

## When to Use This Skill

Use this skill when users want to:
- Fine-tune object detection models (D-FINE, RT-DETR v2, DETR, YOLOS) on cloud GPUs or local
- Fine-tune image classification models (timm: MobileNetV3, MobileViT, ResNet, ViT/DINOv3, or any Transformers classifier) on cloud GPUs or local
- Fine-tune SAM or SAM2 models for segmentation / image matting using bbox or point prompts
- Train bounding-box detectors on custom datasets
- Train image classifiers on custom datasets
- Train segmentation models on custom mask datasets with prompts
- Run vision training jobs on Hugging Face Jobs infrastructure
- Ensure trained vision models are permanently saved to the Hub

## Related Skills

- **`hugging-face-jobs`** — General HF Jobs infrastructure: token authentication, hardware flavors, timeout management, cost estimation, secrets, environment variables, scheduled jobs, and result persistence. **Refer to the Jobs skill for any non-training-specific Jobs questions** (e.g., "how do secrets work?", "what hardware is available?", "how do I pass tokens?").
- **`hugging-face-model-trainer`** — TRL-based language model training (SFT, DPO, GRPO). Use that skill for text/language model fine-tuning.

## Local Script Execution

Helper scripts use PEP 723 inline dependencies. Run them with `uv run`:
```bash
uv run scripts/dataset_inspector.py --dataset username/dataset-name --split train
uv run scripts/estimate_cost.py --help
> See [references/details.md](references/details.md) for full code examples.
hf_jobs("uv", {
    "script": "path/to/dataset_inspector.py",
    "script_args": ["--dataset", "username/dataset-name", "--split", "train"]
})
```

**Option 2: Locally:**
```bash
uv run scripts/dataset_inspector.py --dataset username/dataset-name --split train
```

**Option 3: Via `HfApi().run_uv_job()` (if hf_jobs MCP unavailable):**
```python
from huggingface_hub import HfApi
api = HfApi()
api.run_uv_job(
    script="scripts/dataset_inspector.py",
    script_args=["--dataset", "username/dataset-name", "--split", "train"],
    flavor="cpu-basic",
    timeout=300,
)
```

### Reading Results

- **`✓ READY`** — Dataset is compatible, use directly
- **`✗ NEEDS FORMATTING`** — Needs preprocessing (mapping code provided in output)

## Automatic Bbox Preprocessing

The object detection training script (`scripts/object_detection_training.py`) automatically handles bbox format detection (xyxy→xywh conversion), bbox sanitization, `image_id` generation, string category→integer remapping, and dataset truncation. **No manual preprocessing needed** — just ensure the dataset has `objects.bbox` and `objects.category` columns.

## Training workflow

Copy this checklist and track progress:

```
Training Progress:
- [ ] Step 1: Verify prerequisites (account, token, dataset)
- [ ] Step 2: Validate dataset format (run dataset_inspector.py)
- [ ] Step 3: Ask user about dataset size and validation split
- [ ] Step 4: Prepare training script (OD: scripts/object_detection_training.py, IC: scripts/image_classification_training.py, SAM: scripts/sam_segmentation_training.py)
- [ ] Step 5: Save script locally, submit job, and report details
```

**Step 1: Verify prerequisites**

Follow the Prerequisites Checklist above.

**Step 2: Validate dataset**

Run the dataset inspector BEFORE spending GPU time. See "Dataset Validation" section above.

**Step 3: Ask user preferences**

ALWAYS use the AskUserQuestion tool with option-style format:

> See [references/details.md](references/details.md) for full code examples.

**Step 4: Prepare training script**

For object detection, use [scripts/object_detection_training.py](scripts/object_detection_training.py) as the production-ready template. For image classification, use [scripts/image_classification_training.py](scripts/image_classification_training.py). For SAM/SAM2 segmentation, use [scripts/sam_segmentation_training.py](scripts/sam_segmentation_training.py). All scripts use `HfArgumentParser` — all configuration is passed via CLI arguments in `script_args`, NOT by editing Python variables. For timm model details, see [references/timm_trainer.md](references/timm_trainer.md). For SAM2 training details, see [references/finetune_sam2_trainer.md](references/finetune_sam2_trainer.md).

**Step 5: Save script, submit job, and report**

1. **Save the script locally** to `submitted_jobs/` in the workspace root (create if needed) with a descriptive name like `training_<dataset>_<YYYYMMDD_HHMMSS>.py`. Tell the user the path.
2. **Submit** using `hf_jobs` MCP tool (preferred) or `HfApi().run_uv_job()` — see directive #1 for both methods. Pass all config via `script_args`.
3. **Report** the job ID (from `.id` attribute), monitoring URL, Trackio dashboard (`https://huggingface.co/spaces/{username}/trackio`), expected time, and estimated cost.
4. **Wait for user** to request status checks — don't poll automatically. Training jobs run asynchronously and can take hours.

## Critical directives

These rules prevent common failures. Follow them exactly.

### 1. Job submission: `hf_jobs` MCP tool vs Python API

**`hf_jobs()` is an MCP tool, NOT a Python function.** Do NOT try to import it from `huggingface_hub`. Call it as a tool:

```
hf_jobs("uv", {"script": training_script_content, "flavor": "a10g-large", "timeout": "4h", "secrets": {"HF_TOKEN": "$HF_TOKEN"}})
```

**If `hf_jobs` MCP tool is unavailable**, use the Python API directly:

```python
from huggingface_hub import HfApi, get_token
api = HfApi()
job_info = api.run_uv_job(
    script="path/to/training_script.py",  # file PATH, NOT content
    script_args=["--dataset_name", "cppe-5", ...],
    flavor="a10g-large",
    timeout=14400,  # seconds (4 hours)
    env={"PYTHONUNBUFFERED": "1"},
    secrets={"HF_TOKEN": get_token()},  # MUST use get_token(), NOT "$HF_TOKEN"
)
print(f"Job ID: {job_info.id}")
> See [references/details.md](references/details.md) for full code examples.
hf_token = os.environ.get("HF_TOKEN")
if training_args.push_to_hub and not training_args.hub_token:
    if hf_token:
        training_args.hub_token = hf_token
```

If you write a custom script, you MUST include this token injection before the `Trainer(...)` call.

- Do NOT call `login()` in custom scripts unless replicating the full pattern from `scripts/object_detection_training.py`
- Do NOT rely on implicit token resolution (`hub_token=None`) — unreliable in Jobs
- See the `hugging-face-jobs` skill → *Token Usage Guide* for full details

### 3. JobInfo attribute

Access the job identifier using `.id` (NOT `.job_id` or `.name` — these don't exist):

```python
job_info = api.run_uv_job(...)  # or hf_jobs("uv", {...})
job_id = job_info.id  # Correct -- returns string like "687fb701029421ae5549d998"
```

### 4. Required training flags and HfArgumentParser boolean syntax

`scripts/object_detection_training.py` uses `HfArgumentParser` — all config is passed via `script_args`. Boolean arguments have two syntaxes:

- **`bool` fields** (e.g., `push_to_hub`, `do_train`): Use as bare flags (`--push_to_hub`) or negate with `--no_` prefix (`--no_remove_unused_columns`)
- **`Optional[bool]` fields** (e.g., `greater_is_better`): MUST pass explicit value (`--greater_is_better True`). Bare `--greater_is_better` causes `error: expected one argument`

Required flags for object detection:

```
--no_remove_unused_columns          # MUST: preserves image column for pixel_values
--no_eval_do_concat_batches         # MUST: images have different numbers of target boxes
--push_to_hub                       # MUST: environment is ephemeral
--hub_model_id username/model-name
--metric_for_best_model eval_map
--greater_is_better True            # MUST pass "True" explicitly (Optional[bool])
--do_train
--do_eval
```

Required flags for image classification:

```
--no_remove_unused_columns          # MUST: preserves image column for pixel_values
--push_to_hub                       # MUST: environment is ephemeral
--hub_model_id username/model-name
--metric_for_best_model eval_accuracy
--greater_is_better True            # MUST pass "True" explicitly (Optional[bool])
--do_train
--do_eval
```

Required flags for SAM/SAM2 segmentation:

```
--remove_unused_columns False       # MUST: preserves input_boxes/input_points
--push_to_hub                       # MUST: environment is ephemeral
--hub_model_id username/model-name
--do_train
--prompt_type bbox                  # or "point"
--dataloader_pin_memory False       # MUST: avoids pin_memory issues with custom collator
> See [references/details.md](references/details.md) for full code examples.
OD_SCRIPT_ARGS = [
    "--model_name_or_path", "ustc-community/dfine-small-coco",
    "--dataset_name", "cppe-5",
    "--image_square_size", "640",
    "--output_dir", "dfine_finetuned",
    "--num_train_epochs", "30",
    "--per_device_train_batch_size", "8",
    "--learning_rate", "5e-5",
    "--eval_strategy", "epoch",
    "--save_strategy", "epoch",
    "--save_total_limit", "2",
    "--load_best_model_at_end",
    "--metric_for_best_model", "eval_map",
    "--greater_is_better", "True",
    "--no_remove_unused_columns",
    "--no_eval_do_concat_batches",
    "--push_to_hub",
    "--hub_model_id", "username/model-name",
    "--do_train",
    "--do_eval",
]
```

```python
from huggingface_hub import HfApi, get_token
api = HfApi()
job_info = api.run_uv_job(
    script="scripts/object_detection_training.py",
    script_args=OD_SCRIPT_ARGS,
    flavor="t4-small",
    timeout=14400,
    env={"PYTHONUNBUFFERED": "1"},
    secrets={"HF_TOKEN": get_token()},
)
print(f"Job ID: {job_info.id}")
```

### Key OD `script_args`

- `--model_name_or_path` — recommended: `"ustc-community/dfine-small-coco"` (see model table above)
- `--dataset_name` — the Hub dataset ID
- `--image_square_size` — 480 (fast iteration) or 800 (better accuracy)
- `--hub_model_id` — `"username/model-name"` for Hub persistence
- `--num_train_epochs` — 30 typical for convergence
- `--train_val_split` — fraction to split for validation (default 0.15), set if dataset lacks a validation split
- `--max_train_samples` — truncate training set (useful for quick test runs, e.g. `"785"` for ~10% of a 7.8K dataset)
- `--max_eval_samples` — truncate evaluation set

## Quick start — Image Classification

> See [references/details.md](references/details.md) for full code examples.

```python
from huggingface_hub import HfApi, get_token
api = HfApi()
job_info = api.run_uv_job(
    script="scripts/image_classification_training.py",
    script_args=IC_SCRIPT_ARGS,
    flavor="t4-small",
    timeout=7200,
    env={"PYTHONUNBUFFERED": "1"},
    secrets={"HF_TOKEN": get_token()},
)
print(f"Job ID: {job_info.id}")
```

### Key IC `script_args`

- `--model_name_or_path` — any `timm/` model or Transformers classification model (see model table above)
- `--dataset_name` — the Hub dataset ID
- `--image_column_name` — column containing PIL images (default: `"image"`)
- `--label_column_name` — column containing class labels (default: `"label"`)
- `--hub_model_id` — `"username/model-name"` for Hub persistence
- `--num_train_epochs` — 3-5 typical for classification (fewer than OD)
- `--per_device_train_batch_size` — 16-64 (classification models use less memory than OD)
- `--train_val_split` — fraction to split for validation (default 0.15), set if dataset lacks a validation split
- `--max_train_samples` / `--max_eval_samples` — truncate for quick tests

## Quick start — SAM/SAM2 Segmentation

> See [references/details.md](references/details.md) for full code examples.

```python
from huggingface_hub import HfApi, get_token
api = HfApi()
job_info = api.run_uv_job(
    script="scripts/sam_segmentation_training.py",
    script_args=SAM_SCRIPT_ARGS,
    flavor="t4-small",
    timeout=7200,
    env={"PYTHONUNBUFFERED": "1"},
    secrets={"HF_TOKEN": get_token()},
)
print(f"Job ID: {job_info.id}")
hf_jobs("ps")                                   # List all jobs
hf_jobs("logs", {"job_id": "your-job-id"})      # View logs
hf_jobs("inspect", {"job_id": "your-job-id"})   # Job details
```

**Python API fallback:**
```python
from huggingface_hub import HfApi
api = HfApi()
api.list_jobs()                                  # List all jobs
api.get_job_logs(job_id="your-job-id")           # View logs
api.get_job(job_id="your-job-id")                # Job details
