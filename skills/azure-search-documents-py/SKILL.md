---
name: azure-search-documents-py
description: Azure AI Search SDK for Python. Use for vector search, hybrid search, semantic ranking, indexing, and skillsets. Use when the task involves azure search documents py.
risk: unknown
source: community
date_added: '2026-02-27'
---

# Azure AI Search SDK for Python

Full-text, vector, and hybrid search with AI enrichment capabilities.

## Installation

```bash
pip install azure-search-documents
```

## Environment Variables

```bash
AZURE_SEARCH_ENDPOINT=https://<service-name>.search.windows.net
AZURE_SEARCH_API_KEY=<your-api-key>
AZURE_SEARCH_INDEX_NAME=<your-index-name>
```

## Authentication

### API Key

```python
from azure.search.documents import SearchClient
from azure.core.credentials import AzureKeyCredential

client = SearchClient(
    endpoint=os.environ["AZURE_SEARCH_ENDPOINT"],
    index_name=os.environ["AZURE_SEARCH_INDEX_NAME"],
    credential=AzureKeyCredential(os.environ["AZURE_SEARCH_API_KEY"])
)
```

### Entra ID (Recommended)

```python
from azure.search.documents import SearchClient
from azure.identity import DefaultAzureCredential

client = SearchClient(
    endpoint=os.environ["AZURE_SEARCH_ENDPOINT"],
    index_name=os.environ["AZURE_SEARCH_INDEX_NAME"],
    credential=DefaultAzureCredential()
)
```

## Client Types

| Client | Purpose |
|--------|---------|
| `SearchClient` | Search and document operations |
| `SearchIndexClient` | Index management, synonym maps |
| `SearchIndexerClient` | Indexers, data sources, skillsets |

## Create Index with Vector Field

> See [references/details.md](references/details.md) for full code examples.

## Upload Documents

```python
from azure.search.documents import SearchClient

client = SearchClient(endpoint, "my-index", AzureKeyCredential(key))

documents = [
    {
        "id": "1",
        "title": "Azure AI Search",
        "content": "Full-text and vector search service",
        "content_vector": [0.1, 0.2, ...]  # 1536 dimensions
    }
]

result = client.upload_documents(documents)
print(f"Uploaded {len(result)} documents")
```

## Keyword Search

```python
results = client.search(
    search_text="azure search",
    select=["id", "title", "content"],
    top=10
)

for result in results:
    print(f"{result['title']}: {result['@search.score']}")
```

## Vector Search

> See [references/details.md](references/details.md) for full code examples.

## Hybrid Search (Vector + Keyword)

```python
from azure.search.documents.models import VectorizedQuery

vector_query = VectorizedQuery(
    vector=query_vector,
    k_nearest_neighbors=10,
    fields="content_vector"
)

results = client.search(
    search_text="azure search",
    vector_queries=[vector_query],
    select=["id", "title", "content"],
    top=10
)
```

## Semantic Ranking

```python
from azure.search.documents.models import QueryType

results = client.search(
    search_text="what is azure search",
    query_type=QueryType.SEMANTIC,
    semantic_configuration_name="my-semantic-config",
    select=["id", "title", "content"],
    top=10
)

for result in results:
    print(f"{result['title']}")
    if result.get("@search.captions"):
        print(f"  Caption: {result['@search.captions'][0].text}")
```

## Filters

```python
results = client.search(
    search_text="*",
    filter="category eq 'Technology' and rating gt 4",
    order_by=["rating desc"],
    select=["id", "title", "category", "rating"]
)
```

## Facets

```python
results = client.search(
    search_text="*",
    facets=["category,count:10", "rating"],
    top=0  # Only get facets, no documents
)

for facet_name, facet_values in results.get_facets().items():
    print(f"{facet_name}:")
    for facet in facet_values:
        print(f"  {facet['value']}: {facet['count']}")
```

## Autocomplete & Suggest

```python
# Autocomplete
results = client.autocomplete(
    search_text="sea",
    suggester_name="my-suggester",
    mode="twoTerms"
)

# Suggest
results = client.suggest(
    search_text="sea",
    suggester_name="my-suggester",
    select=["title"]
)
```

## Indexer with Skillset

> See [references/details.md](references/details.md) for full code examples.

## Best Practices

1. **Use hybrid search** for best relevance combining vector and keyword
2. **Enable semantic ranking** for natural language queries
3. **Index in batches** of 100-1000 documents for efficiency
4. **Use filters** to narrow results before ranking
5. **Configure vector dimensions** to match your embedding model
6. **Use HNSW algorithm** for large-scale vector search
7. **Create suggesters** at index creation time (cannot add later)

## Reference Files

| File | Contents |
|------|----------|
| references/vector-search.md | HNSW configuration, integrated vectorization, multi-vector queries |
| references/semantic-ranking.md | Semantic configuration, captions, answers, hybrid patterns |
| scripts/setup_vector_index.py | CLI script to create vector-enabled search index |


---

## Additional Azure AI Search Patterns

### Additional SDK Focus

Write clean, idiomatic Python code for Azure AI Search using `azure-search-documents`.

## Installation for Additional Patterns

```bash
pip install azure-search-documents azure-identity
```

## Environment Variables for Additional Patterns

```bash
AZURE_SEARCH_ENDPOINT=https://<search-service>.search.windows.net
AZURE_SEARCH_INDEX_NAME=<index-name>
# For API key auth (not recommended for production)
AZURE_SEARCH_API_KEY=<api-key>
```

## Authentication for Additional Patterns

**DefaultAzureCredential (preferred)**:
```python
from azure.identity import DefaultAzureCredential
from azure.search.documents import SearchClient

credential = DefaultAzureCredential()
client = SearchClient(endpoint, index_name, credential)
```

**API Key**:
```python
from azure.core.credentials import AzureKeyCredential
from azure.search.documents import SearchClient

client = SearchClient(endpoint, index_name, AzureKeyCredential(api_key))
```

## Client Selection

| Client | Purpose |
|--------|---------|
| `SearchClient` | Query indexes, upload/update/delete documents |
| `SearchIndexClient` | Create/manage indexes, knowledge sources, knowledge bases |
| `SearchIndexerClient` | Manage indexers, skillsets, data sources |
| `KnowledgeBaseRetrievalClient` | Agentic retrieval with LLM-powered Q&A |

## Index Creation Pattern

> See [references/details.md](references/details.md) for full code examples.

## Document Operations

```python
from azure.search.documents import SearchIndexingBufferedSender

# Batch upload with automatic batching
with SearchIndexingBufferedSender(endpoint, index_name, credential) as sender:
    sender.upload_documents(documents)

# Direct operations via SearchClient
search_client = SearchClient(endpoint, index_name, credential)
search_client.upload_documents(documents)      # Add new
search_client.merge_documents(documents)       # Update existing
search_client.merge_or_upload_documents(documents)  # Upsert
search_client.delete_documents(documents)      # Remove
```

## Search Patterns

> See [references/details.md](references/details.md) for full code examples.

## Agentic Retrieval (Knowledge Bases)

For LLM-powered Q&A with answer synthesis, see references/agentic-retrieval.md.

Key concepts:
- **Knowledge Source**: Points to a search index
- **Knowledge Base**: Wraps knowledge sources + LLM for query planning and synthesis
- **Output modes**: `EXTRACTIVE_DATA` (raw chunks) or `ANSWER_SYNTHESIS` (LLM-generated answers)

## Async Pattern

```python
from azure.search.documents.aio import SearchClient

async with SearchClient(endpoint, index_name, credential) as client:
    results = await client.search(search_text="query")
    async for result in results:
        print(result["title"])
> See [references/details.md](references/details.md) for full code examples.
from azure.core.exceptions import (
    HttpResponseError,
    ResourceNotFoundError,
    ResourceExistsError
)

try:
    result = search_client.get_document(key="123")
except ResourceNotFoundError:
    print("Document not found")
except HttpResponseError as e:
    print(f"Search error: {e.message}")
```

## When to Use
This skill is applicable to execute the workflow or actions described in the overview.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
