# Azure Search Documents Py — Code Reference

## ## Create Index with Vector Field

```python
from azure.search.documents.indexes import SearchIndexClient
from azure.search.documents.indexes.models import (
    SearchIndex,
    SearchField,
    SearchFieldDataType,
    VectorSearch,
    HnswAlgorithmConfiguration,
    VectorSearchProfile,
    SearchableField,
    SimpleField
)

index_client = SearchIndexClient(endpoint, AzureKeyCredential(key))

fields = [
    SimpleField(name="id", type=SearchFieldDataType.String, key=True),
    SearchableField(name="title", type=SearchFieldDataType.String),
    SearchableField(name="content", type=SearchFieldDataType.String),
    SearchField(
        name="content_vector",
        type=SearchFieldDataType.Collection(SearchFieldDataType.Single),
        searchable=True,
        vector_search_dimensions=1536,
        vector_search_profile_name="my-vector-profile"
    )
]

vector_search = VectorSearch(
    algorithms=[
        HnswAlgorithmConfiguration(name="my-hnsw")
    ],
    profiles=[
        VectorSearchProfile(
            name="my-vector-profile",
            algorithm_configuration_name="my-hnsw"
        )
    ]
)

index = SearchIndex(
    name="my-index",
    fields=fields,
    vector_search=vector_search
)

index_client.create_or_update_index(index)
```


## ## Vector Search

```python
from azure.search.documents.models import VectorizedQuery

# Your query embedding (1536 dimensions)
query_vector = get_embedding("semantic search capabilities")

vector_query = VectorizedQuery(
    vector=query_vector,
    k_nearest_neighbors=10,
    fields="content_vector"
)

results = client.search(
    vector_queries=[vector_query],
    select=["id", "title", "content"]
)

for result in results:
    print(f"{result['title']}: {result['@search.score']}")
```


## ## Indexer with Skillset

```python
from azure.search.documents.indexes import SearchIndexerClient
from azure.search.documents.indexes.models import (
    SearchIndexer,
    SearchIndexerDataSourceConnection,
    SearchIndexerSkillset,
    EntityRecognitionSkill,
    InputFieldMappingEntry,
    OutputFieldMappingEntry
)

indexer_client = SearchIndexerClient(endpoint, AzureKeyCredential(key))

# Create data source
data_source = SearchIndexerDataSourceConnection(
    name="my-datasource",
    type="azureblob",
    connection_string=connection_string,
    container={"name": "documents"}
)
indexer_client.create_or_update_data_source_connection(data_source)

# Create skillset
skillset = SearchIndexerSkillset(
    name="my-skillset",
    skills=[
        EntityRecognitionSkill(
            inputs=[InputFieldMappingEntry(name="text", source="/document/content")],
            outputs=[OutputFieldMappingEntry(name="organizations", target_name="organizations")]
        )
    ]
)
indexer_client.create_or_update_skillset(skillset)

# Create indexer
indexer = SearchIndexer(
    name="my-indexer",
    data_source_name="my-datasource",
    target_index_name="my-index",
    skillset_name="my-skillset"
)
indexer_client.create_or_update_indexer(indexer)
```


## ## Index Creation Pattern

```python
from azure.search.documents.indexes import SearchIndexClient
from azure.search.documents.indexes.models import (
    SearchIndex, SearchField, VectorSearch, VectorSearchProfile,
    HnswAlgorithmConfiguration, AzureOpenAIVectorizer,
    AzureOpenAIVectorizerParameters, SemanticSearch,
    SemanticConfiguration, SemanticPrioritizedFields, SemanticField
)

index = SearchIndex(
    name=index_name,
    fields=[
        SearchField(name="id", type="Edm.String", key=True),
        SearchField(name="content", type="Edm.String", searchable=True),
        SearchField(name="embedding", type="Collection(Edm.Single)",
                   vector_search_dimensions=3072,
                   vector_search_profile_name="vector-profile"),
    ],
    vector_search=VectorSearch(
        profiles=[VectorSearchProfile(
            name="vector-profile",
            algorithm_configuration_name="hnsw-algo",
            vectorizer_name="openai-vectorizer"
        )],
        algorithms=[HnswAlgorithmConfiguration(name="hnsw-algo")],
        vectorizers=[AzureOpenAIVectorizer(
            vectorizer_name="openai-vectorizer",
            parameters=AzureOpenAIVectorizerParameters(
                resource_url=aoai_endpoint,
                deployment_name=embedding_deployment,
                model_name=embedding_model
            )
        )]
    ),
    semantic_search=SemanticSearch(
        default_configuration_name="semantic-config",
        configurations=[SemanticConfiguration(
            name="semantic-config",
            prioritized_fields=SemanticPrioritizedFields(
                content_fields=[SemanticField(field_name="content")]
            )
        )]
    )
)

index_client = SearchIndexClient(endpoint, credential)
index_client.create_or_update_index(index)
```


## ## Search Patterns

```python
# Basic search
results = search_client.search(search_text="query")

# Vector search
from azure.search.documents.models import VectorizedQuery

results = search_client.search(
    search_text=None,
    vector_queries=[VectorizedQuery(
        vector=embedding,
        k_nearest_neighbors=5,
        fields="embedding"
    )]
)

# Hybrid search (vector + keyword)
results = search_client.search(
    search_text="query",
    vector_queries=[VectorizedQuery(vector=embedding, k_nearest_neighbors=5, fields="embedding")],
    query_type="semantic",
    semantic_configuration_name="semantic-config"
)

# With filters
results = search_client.search(
    search_text="query",
    filter="category eq 'technology'",
    select=["id", "title", "content"],
    top=10
)
```


## ## Async Pattern

```

## Best Practices for Additional Patterns

1. **Use environment variables** for endpoints, keys, and deployment names
2. **Prefer `DefaultAzureCredential`** over API keys for production
3. **Use `SearchIndexingBufferedSender`** for batch uploads (handles batching/retries)
4. **Always define semantic configuration** for agentic retrieval indexes
5. **Use `create_or_update_index`** for idempotent index creation
6. **Close clients** with context managers or explicit `close()`

## Field Types Reference

| EDM Type | Python | Notes |
|----------|--------|-------|
| `Edm.String` | str | Searchable text |
| `Edm.Int32` | int | Integer |
| `Edm.Int64` | int | Long integer |
| `Edm.Double` | float | Floating point |
| `Edm.Boolean` | bool | True/False |
| `Edm.DateTimeOffset` | datetime | ISO 8601 |
| `Collection(Edm.Single)` | List[float] | Vector embeddings |
| `Collection(Edm.String)` | List[str] | String arrays |

## Error Handling

```python


