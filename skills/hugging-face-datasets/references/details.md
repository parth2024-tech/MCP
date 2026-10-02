# Hugging Face Datasets — Code Reference

## ## Python API Usage

```python
from sql_manager import HFDatasetSQL

sql = HFDatasetSQL()

# Query
results = sql.query("cais/mmlu", "SELECT * FROM data WHERE subject='nutrition' LIMIT 10")

# Get schema
schema = sql.describe("cais/mmlu")

# Sample
samples = sql.sample("cais/mmlu", n=5, seed=42)

# Count
count = sql.count("cais/mmlu", where="subject='nutrition'")

# Histogram
dist = sql.histogram("cais/mmlu", "subject")

# Filter and transform
results = sql.filter_and_transform(
    "cais/mmlu",
    select="subject, COUNT(*) as cnt",
    group_by="subject",
    order_by="cnt DESC",
    limit=10
)

# Push to Hub
url = sql.push_to_hub(
    "cais/mmlu",
    "username/nutrition-subset",
    sql="SELECT * FROM data WHERE subject='nutrition'",
    private=True
)

# Export locally
sql.export_to_parquet("cais/mmlu", "output.parquet", sql="SELECT * FROM data LIMIT 100")

sql.close()
```


## ## Useful DuckDB SQL Functions

```sql
-- String functions
LENGTH(column)                    -- String length
regexp_replace(col, '/n', '')     -- Regex replace
regexp_matches(col, 'pattern')    -- Regex match
LOWER(col), UPPER(col)           -- Case conversion

-- Array functions  
choices[0]                        -- Array indexing (0-based)
array_length(choices)             -- Array length
unnest(choices)                   -- Expand array to rows

-- Aggregations
COUNT(*), SUM(col), AVG(col)
GROUP BY col HAVING condition

-- Sampling
USING SAMPLE 10                   -- Random sample
USING SAMPLE 10 (RESERVOIR, 42)   -- Reproducible sample

-- Window functions
ROW_NUMBER() OVER (PARTITION BY col ORDER BY col2)
```


