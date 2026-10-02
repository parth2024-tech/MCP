---
name: gcp-cloud-run
description: Specialized skill for building production-ready serverless. Use when the task involves gcp cloud run.
  applications on GCP. Covers Cloud Run services (containerized), Cloud Run
  Functions (event-driven), cold start optimization, and event-driven
  architecture with Pub/Sub.
risk: unknown
source: vibeship-spawner-skills (Apache 2.0)
date_added: 2026-02-27
---

# GCP Cloud Run

Specialized skill for building production-ready serverless applications on GCP.
Covers Cloud Run services (containerized), Cloud Run Functions (event-driven),
cold start optimization, and event-driven architecture with Pub/Sub.

## Principles

- Cloud Run for containers, Functions for simple event handlers
- Optimize for cold starts with startup CPU boost and min instances
- Set concurrency based on workload (start with 8, adjust)
- Memory includes /tmp filesystem - plan accordingly
- Use VPC Connector only when needed (adds latency)
- Containers should start fast and be stateless
- Handle signals gracefully for clean shutdown

## Patterns

### Cloud Run Service Pattern

Containerized web service on Cloud Run

**When to use**: Web applications and APIs,Need any runtime or library,Complex services with multiple endpoints,Stateless containerized workloads

> See [references/details.md](references/details.md) for full code examples.



### Structure

project/
├── Dockerfile
├── .dockerignore
├── src/
│   ├── index.js
│   └── routes/
├── package.json
└── cloudbuild.yaml

### Gcloud_deploy

# Direct gcloud deployment
gcloud run deploy my-service \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --memory 512Mi \
  --cpu 1 \
  --min-instances 1 \
  --max-instances 100 \
  --concurrency 80 \
  --cpu-boost

### Cloud Run Functions Pattern

Event-driven functions (formerly Cloud Functions)

**When to use**: Simple event handlers,Pub/Sub message processing,Cloud Storage triggers,HTTP webhooks

```javascript
// HTTP Function
// index.js
const functions = require('@google-cloud/functions-framework');

functions.http('helloHttp', (req, res) => {
  const name = req.query.name || req.body.name || 'World';
  res.send(`Hello, ${name}!`);
});
```

```javascript
// Pub/Sub Function
const functions = require('@google-cloud/functions-framework');

functions.cloudEvent('processPubSub', (cloudEvent) => {
  // Decode Pub/Sub message
  const message = cloudEvent.data.message;
  const data = message.data
    ? JSON.parse(Buffer.from(message.data, 'base64').toString())
    : {};

  console.log('Received message:', data);

  // Process message
  processMessage(data);
});
```

```javascript
// Cloud Storage Function
const functions = require('@google-cloud/functions-framework');

functions.cloudEvent('processStorageEvent', async (cloudEvent) => {
  const file = cloudEvent.data;

  console.log(`Event: ${cloudEvent.type}`);
  console.log(`Bucket: ${file.bucket}`);
  console.log(`File: ${file.name}`);

  if (cloudEvent.type === 'google.cloud.storage.object.v1.finalized') {
    await processUploadedFile(file.bucket, file.name);
  }
});
```

> See [references/details.md](references/details.md) for full code examples.

### Cold Start Optimization Pattern

Minimize cold start latency for Cloud Run

**When to use**: Latency-sensitive applications,User-facing APIs,High-traffic services

## 1. Enable Startup CPU Boost

```bash
gcloud run deploy my-service \
  --cpu-boost \
  --region us-central1
```

## 2. Set Minimum Instances

```bash
gcloud run deploy my-service \
  --min-instances 1 \
  --region us-central1
```

## 3. Optimize Container Image

```dockerfile
# Use distroless for minimal image
FROM node:20-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM gcr.io/distroless/nodejs20-debian12
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY src ./src
CMD ["src/index.js"]
```

## 4. Lazy Initialize Heavy Dependencies

```javascript
// Lazy load heavy libraries
let bigQueryClient = null;

function getBigQueryClient() {
  if (!bigQueryClient) {
    const { BigQuery } = require('@google-cloud/bigquery');
    bigQueryClient = new BigQuery();
  }
  return bigQueryClient;
}

// Only initialize when needed
app.get('/api/analytics', async (req, res) => {
  const client = getBigQueryClient();
  const results = await client.query({...});
  res.json(results);
});
```

## 5. Increase Memory (More CPU)

```bash
# Higher memory = more CPU during startup
gcloud run deploy my-service \
  --memory 1Gi \
  --cpu 2 \
  --region us-central1
```

### Optimization_impact

- Startup_cpu_boost: 50% faster cold starts
- Min_instances: Eliminates cold starts for traffic spikes
- Distroless_image: Smaller attack surface, faster pull
- Lazy_init: Defers heavy loading to first request

### Concurrency Configuration Pattern

Proper concurrency settings for Cloud Run

**When to use**: Need to optimize instance utilization,Handle traffic spikes efficiently,Reduce cold starts

## Understanding Concurrency

```bash
# Default concurrency is 80
# Adjust based on your workload

# For I/O-bound workloads (most web apps)
gcloud run deploy my-service \
  --concurrency 80 \
  --cpu 1

# For CPU-bound workloads
gcloud run deploy my-service \
  --concurrency 1 \
  --cpu 1

# For memory-intensive workloads
gcloud run deploy my-service \
  --concurrency 10 \
  --memory 2Gi
```

## Node.js Concurrency

```javascript
// Node.js is single-threaded but handles I/O concurrently
// Use async/await for all I/O operations

// GOOD - async I/O
app.get('/api/data', async (req, res) => {
  const [users, products] = await Promise.all([
    fetchUsers(),
    fetchProducts()
  ]);
  res.json({ users, products });
});

// BAD - blocking operation
app.get('/api/compute', (req, res) => {
  const result = heavyCpuOperation(); // Blocks other requests!
  res.json(result);
});
```

## Python Concurrency with Gunicorn

```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .

# 4 workers for concurrency
CMD exec gunicorn --bind :$PORT --workers 4 --threads 2 main:app
```

```python
# main.py
from flask import Flask
app = Flask(__name__)

@app.route('/api/data')
def get_data():
    return {'status': 'ok'}
```

### Concurrency_guidelines

- Concurrency=1: Only for CPU-bound or unsafe code
- Concurrency=8 20: Memory-intensive workloads
- Concurrency=80: Default, good for I/O-bound
- Concurrency=250: Maximum, for very lightweight handlers

### Pub/Sub Integration Pattern

Event-driven processing with Cloud Pub/Sub

**When to use**: Asynchronous message processing,Decoupled microservices,Event-driven architecture

## Push Subscription to Cloud Run

```bash
# Create topic
gcloud pubsub topics create orders

# Create push subscription to Cloud Run
gcloud pubsub subscriptions create orders-push \
  --topic orders \
  --push-endpoint https://my-service-xxx.run.app/pubsub \
  --ack-deadline 600
```

> See [references/details.md](references/details.md) for full code examples.

## Publishing Messages

> See [references/details.md](references/details.md) for full code examples.

## Dead Letter Queue

```bash
# Create DLQ topic
gcloud pubsub topics create orders-dlq

# Update subscription with DLQ
gcloud pubsub subscriptions update orders-push \
  --dead-letter-topic orders-dlq \
  --max-delivery-attempts 5
```

### Cloud SQL Connection Pattern

Connect Cloud Run to Cloud SQL securely

**When to use**: Need relational database,Migrating existing applications,Complex queries and transactions

```bash
# Deploy with Cloud SQL connection
gcloud run deploy my-service \
  --add-cloudsql-instances PROJECT:REGION:INSTANCE \
  --set-env-vars INSTANCE_CONNECTION_NAME="PROJECT:REGION:INSTANCE" \
  --set-env-vars DB_NAME="mydb" \
  --set-env-vars DB_USER="myuser"
```

> See [references/details.md](references/details.md) for full code examples.


### Best_practices

- Use connection pooling (max 5-10 per instance)
- Set appropriate idle timeouts
- Handle connection errors gracefully
- Consider Cloud SQL Proxy for local development

### Secret Manager Integration

Securely manage secrets in Cloud Run

**When to use**: API keys, database passwords,Service account keys,Any sensitive configuration

```bash
# Create secret
echo -n "my-secret-value" | gcloud secrets create my-secret --data-file=-

# Mount as environment variable
gcloud run deploy my-service \
  --update-secrets=API_KEY=my-secret:latest

# Mount as file volume
gcloud run deploy my-service \
  --update-secrets=/secrets/api-key=my-secret:latest
```

```javascript
// Access mounted as environment variable
const apiKey = process.env.API_KEY;

// Access mounted as file
const fs = require('fs');
const apiKey = fs.readFileSync('/secrets/api-key', 'utf8');

// Access via Secret Manager API (when not mounted)
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');
const client = new SecretManagerServiceClient();

async function getSecret(name) {
  const [version] = await client.accessSecretVersion({
    name: `projects/${projectId}/secrets/${name}/versions/latest`
  });
  return version.payload.data.toString();
}
> See [references/details.md](references/details.md) for full code examples.
# cloudbuild.yaml
steps:
  - name: 'gcr.io/cloud-builders/gcloud'
    args:
      - 'run'
      - 'deploy'
      - 'my-service'
      - '--memory=1Gi'  # Include /tmp overhead
      - '--image=gcr.io/$PROJECT_ID/my-service'
```

## Stream instead of buffering

```python
# BAD - buffers entire file in /tmp
def process_large_file(bucket_name, blob_name):
    blob = bucket.blob(blob_name)
    blob.download_to_filename('/tmp/large_file')
    with open('/tmp/large_file', 'rb') as f:
        process(f.read())

# GOOD - stream processing
def process_large_file(bucket_name, blob_name):
    blob = bucket.blob(blob_name)
    with blob.open('rb') as f:
        for chunk in iter(lambda: f.read(8192), b''):
            process_chunk(chunk)
```

## Use Cloud Storage for large files

```python
from google.cloud import storage

def process_with_gcs(bucket_name, input_blob, output_blob):
    client = storage.Client()
    bucket = client.bucket(bucket_name)

    # Process directly to/from GCS
    input_blob = bucket.blob(input_blob)
    output_blob = bucket.blob(output_blob)

    with input_blob.open('rb') as reader:
        with output_blob.open('wb') as writer:
            for chunk in iter(lambda: reader.read(65536), b''):
                processed = transform(chunk)
                writer.write(processed)
```

## Monitor memory usage

```python
import psutil
import logging

def log_memory():
    memory = psutil.virtual_memory()
    logging.info(f"Memory: {memory.percent}% used, "
                f"{memory.available / 1024 / 1024:.0f}MB available")
> See [references/details.md](references/details.md) for full code examples.
# For I/O-bound workloads (most web apps)
gcloud run deploy my-service \
  --concurrency=80 \
  --max-instances=100

# For CPU-bound workloads
gcloud run deploy my-service \
  --concurrency=4 \
  --cpu=2

# Only use 1 when absolutely necessary
gcloud run deploy my-service \
  --concurrency=1 \
  --max-instances=1000  # Be prepared for many instances
```

## Node.js - use async properly

```javascript
// With high concurrency, ensure async operations
const express = require('express');
const app = express();

app.get('/api/data', async (req, res) => {
  // All I/O should be async
  const data = await fetchFromDatabase();
  const enriched = await enrichData(data);
  res.json(enriched);
});

// Concurrency 80+ is safe for async I/O workloads
```

## Python - use async framework

```python
from fastapi import FastAPI
import asyncio
import httpx

app = FastAPI()

@app.get("/api/data")
async def get_data():
    # Async I/O allows high concurrency
    async with httpx.AsyncClient() as client:
        response = await client.get("https://api.example.com/data")
        return response.json()

# Concurrency 80+ safe with async framework
```

## Calculate concurrency

```
concurrency = memory_limit / per_request_memory

Example:
- 512MB container
- 20MB per request overhead
- Safe concurrency: ~25
> See [references/details.md](references/details.md) for full code examples.
# CPU allocated even outside requests
gcloud run deploy my-service \
