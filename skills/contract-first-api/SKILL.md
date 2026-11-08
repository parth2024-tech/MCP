---
name: contract-first-api
description: "Author and compile contract-first API specifications using TypeSpec (tsp). Generates OpenAPI 3.1, JSON Schemas, and synchronized type-safe client/server definitions with zero manual YAML editing."
category: api
risk: safe
date_added: "2026-11-09"
tags: [api, typespec, openapi, contract-first, schema-validation]
---

# Contract-First API Design (`tsp` / TypeSpec)

## Core Directives
1. **Single Source of Truth:** Never write raw OpenAPI YAML or drift backend route types from frontend queries. Define the contract in TypeSpec (`main.tsp`) or shared Zod/ts-rest schemas first.
2. **Deterministic Compilation:** Compile the contract to standard OpenAPI 3.1 via `tsp compile .` before generating API routes.

## Quickstart & Usage

### 1. Initialize API Contract
Create `main.tsp`:
```tsp
import "@typespec/http";
import "@typespec/openapi3";

using TypeSpec.Http;

@service({
  title: "Service API",
  version: "1.0.0",
})
namespace Service;

model Task {
  id: string;
  title: string;
  completed: boolean;
}

@route("/tasks")
interface Tasks {
  @get list(): Task[];
  @post create(@body task: Omit<Task, "id">): Task;
}
```

### 2. Compile to OpenAPI 3.1
```bash
tsp compile main.tsp
```
Outputs standard `tsp-output/@typespec/openapi3/openapi.yaml` without writing verbose YAML by hand.
