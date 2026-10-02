---
name: web-scraper
description: Web scraping inteligente multi-estrategia. Extrai dados estruturados de paginas web (tabelas, listas, precos). Paginacao, monitoramento e export CSV/JSON. Use when the task involves web scraper.
risk: safe
source: community
date_added: '2026-03-06'
author: renat
tags:
- scraping
- data-extraction
- automation
- csv
tools:
- claude-code
- antigravity
- cursor
- gemini-cli
- codex-cli
---

# Web Scraper

## Overview

Web scraping inteligente multi-estrategia. Extrai dados estruturados de paginas web (tabelas, listas, precos). Paginacao, monitoramento e export CSV/JSON.

## When to Use This Skill

- When the user mentions "scraper" or related topics
- When the user mentions "scraping" or related topics
- When the user mentions "extrair dados web" or related topics
- When the user mentions "web scraping" or related topics
- When the user mentions "raspar dados" or related topics
- When the user mentions "coletar dados site" or related topics

## Do Not Use This Skill When

- The task is unrelated to web scraper
- A simpler, more specific tool can handle the request
- The user needs general-purpose assistance without domain expertise

## How It Works

Execute phases in strict order. Each phase feeds the next.

```
1. CLARIFY  ->  2. RECON  ->  3. STRATEGY  ->  4. EXTRACT  ->  5. TRANSFORM  ->  6. VALIDATE  ->  7. FORMAT
> See [references/details.md](references/details.md) for full code examples.
WebFetch(
  url = TARGET_URL,
  prompt = "Analyze this page structure and report:
    1. Page type: article, product listing, search results, data table,
       directory, dashboard, API docs, FAQ, pricing page, job board, events, or other
    2. Main content structure: tables, ordered/unordered lists, card grid, free-form text,
       accordion/collapsible sections, tabs
    3. Approximate number of distinct data items visible
    4. JavaScript rendering indicators: empty containers, loading spinners,
       SPA framework markers (React root, Vue app, Angular), minimal HTML with heavy JS
    5. Pagination: next/prev links, page numbers, load-more buttons,
       infinite scroll indicators, total results count
    6. Data density: how much structured, extractable data exists
    7. List the main data fields/columns available for extraction
    8. Embedded structured data: JSON-LD, microdata, OpenGraph tags
    9. Available download links: CSV, Excel, PDF, API endpoints"
)
Structured data (JSON-LD, microdata) has what we need?
 |
 +-- YES --> STRATEGY E: Extract structured data directly
 |
 +-- NO: Content fully visible in WebFetch?
      |
      +-- YES: Need precise element targeting?
      |    |
      |    +-- NO  --> STRATEGY A: WebFetch + AI extraction
      |    +-- YES --> STRATEGY B: Browser automation
      |
      +-- NO: JavaScript rendering detected?
           |
           +-- YES --> STRATEGY B: Browser automation
           +-- NO:  API/JSON/XML endpoint or download link?
                |
                +-- YES --> STRATEGY C: Bash (curl + jq)
                +-- NO  --> Report access issue to user
```

## Strategy A: Webfetch With Ai Extraction

**Best for**: Static pages, articles, simple tables, well-structured HTML.

Use WebFetch with a targeted extraction prompt tailored to the mode:

```
WebFetch(
  url = URL,
  prompt = "Extract [DATA_TARGET] from this page.
    Return ONLY the extracted data as [FORMAT] with these columns/fields: [FIELDS].
    Rules:
    - If a value is missing or unclear, use 'N/A'
    - Do not include navigation, ads, footers, or unrelated content
    - Preserve original values exactly (numbers, currencies, dates)
    - Include ALL matching items, not just the first few
    - For each item, also extract the URL/link if available"
)
> See [references/details.md](references/details.md) for full code examples.
// Table extraction
const rows = document.querySelectorAll('TABLE_SELECTOR tr');
const data = Array.from(rows).map(row => {
  const cells = row.querySelectorAll('td, th');
  return Array.from(cells).map(c => c.textContent.trim());
});
JSON.stringify(data);
```

```javascript
// List/card extraction
const items = document.querySelectorAll('ITEM_SELECTOR');
const data = Array.from(items).map(item => ({
  field1: item.querySelector('FIELD1_SELECTOR')?.textContent?.trim() || null,
  field2: item.querySelector('FIELD2_SELECTOR')?.textContent?.trim() || null,
  link: item.querySelector('a')?.href || null,
}));
JSON.stringify(data);
```

8. For lazy-loaded content, scroll and re-extract:
   `computer(action="scroll", scroll_direction="down", tabId=TAB)`
   then `computer(action="wait", duration=2, tabId=TAB)`

## Strategy C: Bash (Curl + Jq)

**Best for**: REST APIs, JSON endpoints, XML feeds, CSV/Excel downloads.

> See [references/details.md](references/details.md) for full code examples.

## Strategy D: Hybrid

When a single strategy is insufficient, combine:
1. WebSearch to discover relevant URLs
2. WebFetch for initial content assessment
3. Browser automation for JS-heavy sections
4. Bash for post-processing (jq, python for data cleaning)

## Strategy E: Structured Data Extraction

When JSON-LD, microdata, or OpenGraph is present:
1. Use Browser `javascript_tool` to extract structured data:
```javascript
const scripts = document.querySelectorAll('script[type="application/ld+json"]');
const data = Array.from(scripts).map(s => {
  try { return JSON.parse(s.textContent); } catch { return null; }
}).filter(Boolean);
JSON.stringify(data);
> See [references/details.md](references/details.md) for full code examples.
"Extract ALL rows from the table(s) on this page.
Return as a markdown table with exact column headers.
Include every row - do not truncate or summarize.
Preserve numeric precision, currencies, and units."
```

## List Mode

WebFetch prompt:
```
"Extract each [ITEM_TYPE] from this page.
For each item, extract: [FIELD_LIST].
Return as a JSON array of objects with these keys: [KEY_LIST].
Include ALL items, not just the first few. Include link/URL for each item if available."
```

## Article Mode

WebFetch prompt:
```
"Extract article metadata:
- title, author, date, tags/categories, word count estimate
- Key factual data points, statistics, and named entities
Return as structured markdown. Summarize the content; do not reproduce full text."
```

## Product Mode

WebFetch prompt:
```
"Extract product data with these exact fields:
- name, brand, price, currency, originalPrice (if discounted),
  availability, description (first 200 chars), rating, reviewCount,
  specifications (as key-value pairs), productUrl, imageUrl
Return as JSON. Use null for missing fields."
```

Also check for JSON-LD `Product` schema (Strategy E) first.

## Contact Mode

WebFetch prompt:
```
"Extract contact information for each person/entity:
- name, title, role, email, phone, address, organization, website, linkedinUrl
Return as a markdown table. Only extract real contacts visible on the page."
```

## Faq Mode

WebFetch prompt:
```
"Extract all question-answer pairs from this page.
For each FAQ item extract:
- question: the exact question text
- answer: the answer text (first 300 chars if long)
- category: the section/category if grouped
Return as a JSON array of objects."
```

## Pricing Mode

WebFetch prompt:
```
"Extract all pricing plans/tiers from this page.
For each plan extract:
- planName, monthlyPrice, annualPrice, currency
- features (array of included features)
- limitations (array of limits or excluded features)
- ctaText (call-to-action button text)
- highlighted (true if marked as recommended/popular)
Return as JSON. Use null for missing fields."
```

## Events Mode

WebFetch prompt:
```
"Extract all events/sessions from this page.
For each event extract:
- title, date, time, endTime, location, description (first 200 chars)
- speakers (array of names), category, registrationUrl
Return as JSON. Use null for missing fields."
```

## Jobs Mode

WebFetch prompt:
```
"Extract all job listings from this page.
For each job extract:
- title, company, location, salary, salaryRange, type (full-time/part-time/contract)
- postedDate, description (first 200 chars), applyUrl, tags
Return as JSON. Use null for missing fields."
> See [references/details.md](references/details.md) for full code examples.

## Extraction Results

**Source:** [Page Title](http://example.com)
**Date:** YYYY-MM-DD HH:MM UTC
**Items:** N records (M fields each)
**Confidence:** HIGH | MEDIUM | LOW
**Strategy:** A (WebFetch) | B (Browser) | C (API) | E (Structured Data)
**Format:** Markdown Table | JSON | CSV

---

[DATA HERE]

---

**Notes:**
- [Any gaps, issues, or observations]
- [Transforms applied: deduplication, normalization, etc.]
- [Pages scraped if paginated: "Pages 1-5 of 12"]
- [Auto-escalation if it occurred: "Escalated from WebFetch to Browser"]
```

## Markdown Table Rules

- Left-align text columns (`:---`), right-align numbers (`---:`)
- Consistent column widths for readability
- Include summary row for numeric data when useful (totals, averages)
- Maximum 10 columns per table; split wider data into multiple tables
  or suggest JSON format
- Truncate long cell values to 60 chars with `...` indicator
- Use `N/A` for missing values, never leave cells empty
- For multi-page results, show combined table (not per-page)

## Json Rules

- Use camelCase for keys (e.g. `productName`, `unitPrice`)
- Wrap in metadata envelope:
  ```json
  {
    "metadata": {
      "source": "URL",
      "title": "Page Title",
      "extractedAt": "ISO-8601",
      "itemCount": 47,
      "fieldCount": 6,
      "confidence": "HIGH",
      "strategy": "A",
      "transforms": ["deduplication", "priceNormalization"],
      "notes": []
    },
    "data": [ ... ]
  }
> See [references/details.md](references/details.md) for full code examples.
