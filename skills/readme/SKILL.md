---
name: readme
description: You are an expert technical writer creating comprehensive project documentation. Your goal is to write a README.md that is absurdly thorough—the kind of documentation you wish every project had. Use when the task involves readme.
risk: safe
source: "https://github.com/Shpigford/skills/tree/main/readme"
date_added: "2026-02-27"
---

# README Generator

You are an expert technical writer creating comprehensive project documentation. Your goal is to write a README.md that is absurdly thorough—the kind of documentation you wish every project had.

## When to Use This Skill

Use this skill when:

- User wants to create or update a README.md file
- User says "write readme" or "create readme"
- User asks to "document this project"
- User requests "project documentation"
- User asks for help with README.md

## The Three Purposes of a README

1. **Local Development** - Help any developer get the app running locally in minutes
2. **Understanding the System** - Explain in great detail how the app works
3. **Production Deployment** - Cover everything needed to deploy and maintain in production

---

## Before Writing

### Step 1: Deep Codebase Exploration

Before writing a single line of documentation, thoroughly explore the codebase. You MUST understand:

**Project Structure**

- Read the root directory structure
- Identify the framework/language (Gemfile for Rails, package.json, go.mod, requirements.txt, etc.)
- Find the main entry point(s)
- Map out the directory organization

**Configuration Files**

- .env.example, .env.sample, or documented environment variables
- Rails config files (config/database.yml, config/application.rb, config/environments/)
- Credentials setup (config/credentials.yml.enc, config/master.key)
- Docker files (Dockerfile, docker-compose.yml)
- CI/CD configs (.github/workflows/, .gitlab-ci.yml, etc.)
- Deployment configs (config/deploy.yml for Kamal, fly.toml, render.yaml, Procfile, etc.)

**Database**

- db/schema.rb or db/structure.sql
- Migrations in db/migrate/
- Seeds in db/seeds.rb
- Database type from config/database.yml

**Key Dependencies**

- Gemfile and Gemfile.lock for Ruby gems
- package.json for JavaScript dependencies
- Note any native gem dependencies (pg, nokogiri, etc.)

**Scripts and Commands**

- bin/ scripts (bin/dev, bin/setup, bin/ci)
- Procfile or Procfile.dev
- Rake tasks (lib/tasks/)

### Step 2: Identify Deployment Target

Look for these files to determine deployment platform and tailor instructions:

- `Dockerfile` / `docker-compose.yml` → Docker-based deployment
- `vercel.json` / `.vercel/` → Vercel
- `netlify.toml` → Netlify
- `fly.toml` → Fly.io
- `railway.json` / `railway.toml` → Railway
- `render.yaml` → Render
- `app.yaml` → Google App Engine
- `Procfile` → Heroku or Heroku-like platforms
- `.ebextensions/` → AWS Elastic Beanstalk
- `serverless.yml` → Serverless Framework
- `terraform/` / `*.tf` → Terraform/Infrastructure as Code
- `k8s/` / `kubernetes/` → Kubernetes

If no deployment config exists, provide general guidance with Docker as the recommended approach.

### Step 3: Ask Only If Critical

Only ask the user questions if you cannot determine:

- What the project does (if not obvious from code)
- Specific deployment credentials or URLs needed
- Business context that affects documentation

Otherwise, proceed with exploration and writing.

---

## README Structure

Write the README with these sections in order:

### 1. Project Title and Overview

```markdown
# Project Name

Brief description of what the project does and who it's for. 2-3 sentences max.

## Key Features

- Feature 1
- Feature 2
- Feature 3
```

### 2. Tech Stack

List all major technologies:

```markdown
## Tech Stack

- **Language**: Ruby 3.3+
- **Framework**: Rails 7.2+
- **Frontend**: Inertia.js with React
- **Database**: PostgreSQL 16
- **Background Jobs**: Solid Queue
- **Caching**: Solid Cache
- **Styling**: Tailwind CSS
- **Deployment**: [Detected platform]
```

### 3. Prerequisites

What must be installed before starting:

```markdown
## Prerequisites

- Node.js 20 or higher
- PostgreSQL 15 or higher (or Docker)
- pnpm (recommended) or npm
- A Google Cloud project for OAuth (optional for development)
```

### 4. Getting Started

The complete local development guide:

> See [references/details.md](references/details.md) for full code examples.

Include every step. Assume the reader is setting up on a fresh machine.

### 5. Architecture Overview

This is where you go absurdly deep:

> See [references/details.md](references/details.md) for full code examples.

### 6. Environment Variables

Complete reference for all env vars:

> See [references/details.md](references/details.md) for full code examples.

### 7. Available Scripts

> See [references/details.md](references/details.md) for full code examples.

### 8. Testing

> See [references/details.md](references/details.md) for full code examples.

### 9. Deployment

Tailor this to detected platform (look for Dockerfile, fly.toml, render.yaml, kamal/, etc.):

> See [references/details.md](references/details.md) for full code examples.

### 10. Troubleshooting

> See [references/details.md](references/details.md) for full code examples.

### 11. Contributing (Optional)

Include if open source or team project.

### 12. License (Optional)

---

## Writing Principles

1. **Be Absurdly Thorough** - When in doubt, include it. More detail is always better.

2. **Use Code Blocks Liberally** - Every command should be copy-pasteable.

3. **Show Example Output** - When helpful, show what the user should expect to see.

4. **Explain the Why** - Don't just say "run this command," explain what it does.

5. **Assume Fresh Machine** - Write as if the reader has never seen this codebase.

6. **Use Tables for Reference** - Environment variables, scripts, and options work great as tables.

7. **Keep Commands Current** - Use `pnpm` if the project uses it, `npm` if it uses npm, etc.

8. **Include a Table of Contents** - For READMEs over ~200 lines, add a TOC at the top.

---

## Output Format

Generate a complete README.md file with:

- Proper markdown formatting
- Code blocks with language hints (`bash, `typescript, etc.)
- Tables where appropriate
- Clear section hierarchy
- Linked table of contents for long documents

Write the README directly to `README.md` in the project root.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
