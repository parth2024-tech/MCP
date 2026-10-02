# Monte Carlo Validation Notebook — Code Reference

## ## Parameter Cell Spec

```

Parameter types:
- `text`: Free-form text input (used for database names)
- `schema_selector`: Two dropdowns (database -> schema), value stored as `DATABASE.SCHEMA`
- `dropdown`: Select from predefined options

# Task

Generate a SQL Notebook with validation queries based on the mode and target.

## Phase 1: Get Changed Files

The approach differs based on mode:

### If PR mode (GitHub PR):

1. Extract the PR number and repo from the target URL.
   - Example: `https://github.com/monte-carlo-data/dbt/pull/3386` -> owner=`monte-carlo-data`, repo=`dbt`, PR=`3386`

2. Fetch PR metadata using `gh`:
```bash


## ### 2a. Model Metadata

   ```

3. **Error handling**: If the script fails, **STOP immediately** and report the error. Do NOT proceed with notebook generation if schema resolution fails.

4. **Output**: The script prints the resolved schema (e.g., `PROD`, `PROD_STAGE`, `PROD_LINEAGE`)

**Note**: Do NOT manually parse dbt_project.yml or model configs for schema -- always use the script. It handles model config overrides, dbt_project.yml routing rules, PROD_ prefix for custom schemas, and defaults to `PROD`.

**Config block** -- Look for `{{ config(...) }}` and extract:
- `materialized` -- 'table', 'view', 'incremental', 'ephemeral'
- `unique_key` -- the dedup key (may be a string or list)
- `cluster_by` -- clustering fields (may contain the time axis)

**Core segmentation fields** -- Scan the entire model SQL for fields likely to be business keys:
- Fields named `*_id` (e.g., `account_id`, `resource_id`, `monitor_id`) that appear in JOIN ON, GROUP BY, PARTITION BY, or `unique_key`
- Deduplicate and rank by frequency. Take the top 3.

**Time axis field** -- Detect the model's time dimension (in priority order):
1. `is_incremental()` block: field used in the WHERE comparison
2. `cluster_by` config: timestamp/date fields
3. Field name conventions: `ingest_ts`, `created_time`, `date_part`, `timestamp`, `run_start_time`, `export_ts`, `event_created_time`
4. ORDER BY DESC in QUALIFY/ROW_NUMBER

If no time axis is found, skip time-axis queries for this model.

### 2b. Diff Analysis

Parse the diff hunks for this file. Classify each changed line:

- **Changed fields** -- Lines added/modified in SELECT clauses or CTE definitions. Extract the output column name.
- **Changed filters** -- Lines added/modified in WHERE clauses.
- **Changed joins** -- Lines added/modified in JOIN ON conditions.
- **Changed unique_key** -- If `unique_key` in config was modified, note both old and new values.
- **New columns** -- Columns in "after" SELECT that don't appear in "before" (pure additions).

### 2c. Model Classification

Classify each model as **new** or **modified** based on the diff:
- If the diff for this file contains `new file mode` → classify as **new**
- Otherwise → classify as **modified**

This classification determines which query patterns are generated in Phase 3.

**Note:** For **new models**, Phase 2b diff analysis is skipped (there is no "before" to compare against). Phase 2a metadata extraction still applies.

## Phase 3: Generate Validation Queries

For each changed model, generate the applicable queries based on its classification (new vs modified).

**CRITICAL: Parameter Placeholder Syntax**

Use **double curly braces** `{{...}}` for parameter placeholders. Do NOT use `${...}` or any other syntax.

Correct: `{{prod_db}}.PROD.AGENT_RUNS`
Wrong: `${prod_db}.PROD.AGENT_RUNS`

**Table Reference Format:**
- Use `{{prod_db}}.<SCHEMA>.<TABLE_NAME>` for prod queries
- Use `{{dev_db}}.<SCHEMA>.<TABLE_NAME>` for dev queries
- `<SCHEMA>` is **hardcoded per-model** using the output from the schema resolution script

---

### Query Patterns for NEW Models

For new models, all queries target `{{dev_db}}` only. No comparison queries are generated since no prod table exists.

#### Pattern 7-new: Total Row Count
**Trigger:** Always.

```sql


## #### Pattern 3: Before/After Comparison

```sql
WITH prod AS (
    SELECT <group_fields>, COUNT(*) AS cnt
    FROM {{prod_db}}.<SCHEMA>.<TABLE_NAME>
    GROUP BY <group_fields>
),
dev AS (
    SELECT <group_fields>, COUNT(*) AS cnt
    FROM {{dev_db}}.<SCHEMA>.<TABLE_NAME>
    GROUP BY <group_fields>
)
SELECT
    COALESCE(b.<field>, d.<field>) AS <field>,
    COALESCE(b.cnt, 0) AS cnt_prod,
    COALESCE(d.cnt, 0) AS cnt_dev,
    COALESCE(d.cnt, 0) - COALESCE(b.cnt, 0) AS diff
FROM prod b
FULL OUTER JOIN dev d ON b.<field> = d.<field>
ORDER BY ABS(diff) DESC
LIMIT 100
```


## ### 4b. Parameter Cells

```yaml
# Include ONLY if there are modified models:
- id: param-prod-db
  type: parameter
  content:
    name: prod_db
    config:
      type: text
      default_value: "ANALYTICS"
      placeholder: "Prod database (e.g., ANALYTICS)"
  display_type: table

# Always include:
- id: param-dev-db
  type: parameter
  content:
    name: dev_db
    config:
      type: text
      default_value: "PERSONAL_<USER>"
      placeholder: "Dev database (e.g., PERSONAL_JSMITH)"
  display_type: table
```


## ### 4c. Markdown Summary Cell

```yaml
- id: cell-summary
  type: markdown
  content: |
    # Validation Queries for <PR or Local Branch>
    ## Summary
    - **Title:** <title>
    - **Author:** <author>
    - **Source:** <PR URL or "Local branch: <branch>">
    - **Status:** <merge_timestamp or "Not yet merged" or "N/A (local)">
    ## Changes
    <brief description based on diff analysis>
    ## Changed Models
    - `<SCHEMA>.<TABLE_NAME>` (from `<file_path>`)
    ## How to Use
    1. Select your Snowflake connector above
    2. Set **dev_db** to your dev database (e.g., `PERSONAL_JSMITH`)
    3. If modified models are present, set **prod_db** to your prod database (e.g., `ANALYTICS`)
    4. Run single-table queries first, then comparison queries
  display_type: table
```


## ### 4d. SQL Cell Format

```

### 4e. Cell Organization

Cells are ordered consistently for both model types, following this sequence:

**New models:**
1. Summary markdown cell (note that model is new)
2. Parameter cells (dev_db only — no prod_db if all models are new)
3. Total row count (Pattern 7-new)
4. Sample data preview (Pattern 9)
5. Core segmentation counts (Pattern 2-new)
6. Uniqueness check (Pattern 5), NULL rate check (Pattern 6-new), Time-axis continuity (Pattern 8)

**Modified models:**
1. Summary markdown cell
2. Parameter cells (prod_db, dev_db)
3. Total row count (Pattern 7)
4. Sample data preview (Pattern 9)
5. Core segmentation counts (Pattern 2)
6. Changed field distribution (Pattern 1)
7. Uniqueness check (Pattern 5), NULL rate check (Pattern 6), Time-axis continuity (Pattern 8)
8. Before/after comparisons (Pattern 3), Row count comparison (Pattern 7b)

## Phase 5: Generate Import URL

1. Write notebook YAML to `/tmp/validation_notebook_working/<id>/notebook.yaml`
2. Run the URL generation script:
```bash


## ## Notebook Opened

```

## Important Guidelines

1. **Do NOT execute queries** -- only generate the notebook
2. **Keep SQL readable** -- proper formatting and meaningful aliases
3. **Include LIMIT 100** on queries that could return many rows
4. **Use double curly braces** -- `{{prod_db}}` NOT `${prod_db}`
5. **Use correct table format** -- `{{prod_db}}.<SCHEMA>.<TABLE>` and `{{dev_db}}.<SCHEMA>.<TABLE>`
6. **Always use the schema resolution script** -- do NOT manually parse dbt_project.yml
7. **Schema is NOT a parameter** -- only `prod_db` and `dev_db` are parameters
8. **Skip ephemeral models** -- they have no physical table
9. **Truncate notebook name** -- keep under 50 chars
10. **Generate unique cell IDs** -- use pattern like `cell-p3-model-1`
11. **YAML multiline content** -- use `|` block scalar for SQL with comments
12. **ASCII-only YAML** -- the script sanitizes and validates before encoding

## Query Pattern Reference

| Pattern | Name | Trigger | Model Type | Database | Order |
|---------|------|---------|------------|----------|-------|
| 7 / 7-new | Total Row Count | Always | Both | `{{prod_db}}` (modified) / `{{dev_db}}` (new) | 1 |
| 9 | Sample Data Preview | Always | Both | `{{prod_db}}` (modified) / `{{dev_db}}` (new) | 2 |
| 2 / 2-new | Core Segmentation Counts | Always | Both | `{{prod_db}}` (modified) / `{{dev_db}}` (new) | 3 |
| 1 | Changed Field Distribution | Column modified in diff (not added) | Modified only | `{{prod_db}}` | 4 |
| 5 | Uniqueness Check | JOIN/unique_key changed (modified) / Always (new) | Both | `{{dev_db}}` | 5 |
| 6 / 6-new | NULL Rate Check | New column or COALESCE (modified) / Always (new) | Both | Added col: `{{dev_db}}` only; COALESCE: Both (modified) / `{{dev_db}}` (new) | 5 |
| 8 | Time-Axis Continuity | Incremental or time field | Both | `{{prod_db}}` (modified) / `{{dev_db}}` (new) | 5 |
| 3 | Before/After Comparison | Changed fields (not added) | Modified only | Both | 6 |
| 7b | Row Count Comparison | Always | Modified only | Both | 6 |

## MC Bridge Setup Help

If the user asks how to install or set up MC Bridge, fetch the README from the mc-bridge repo and show the relevant quick start / setup instructions:

```bash


