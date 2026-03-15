# Realtime Job Search

Realtime job search across a fixed set of public company career pages, with no database, no auth, no background scheduler, and no persistent storage.

## Stack

- Next.js 15 + TypeScript
- Tailwind CSS
- Node.js runtime
- `undici` + Cheerio for primary scraping
- Playwright as a fallback for JS-rendered pages
- `p-limit` for bounded concurrency
- `date-fns` for posted-date normalization
- `zod` for request and response validation
- `lru-cache` for in-memory 5-minute search caching

## What it does

- Searches only the configured target companies
- Scrapes public career pages in real time on each request
- Defaults to the Washington DC Metro Area preset
- Filters by keyword, company, posted window, and remote type
- Excludes undated jobs in v1
- Returns partial results when some sources fail or time out
- Deduplicates results inside each response without a database

## Local setup

1. Install dependencies:

```bash
npm install
```

2. Start the app:

```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000)

`npm install` also installs the Playwright Chromium browser through `postinstall`.

## Local verification

```bash
npm run typecheck
npm run build
```

## Project layout

```text
src/
  app/
    api/search/route.ts
    page.tsx
  components/
    SearchForm.tsx
    ResultsList.tsx
    ResultCard.tsx
    CompanyFilter.tsx
    ProgressPanel.tsx
  lib/
    adapters/
      greenhouse.ts
      workday.ts
      oracleHcm.ts
      icims.ts
      brassring.ts
      taleo.ts
      custom/
    browser.ts
    cache.ts
    companyConfig.ts
    dedupe.ts
    metroPresets.ts
    normalize.ts
    parseDate.ts
    search.ts
    types.ts
```

## Search behavior

- `POST /api/search`
- Input is validated with Zod
- Metro presets expand into app-side location matching
- Company scrapers run in parallel with `Promise.allSettled`
- Concurrency is capped at 5 companies at once
- Each company gets an 8-second timeout
- Results are normalized, date-filtered, metro-filtered, deduped, and sorted newest first
- Identical searches are cached in memory for 5 minutes

## Deployment notes

Use a full Node deployment that can run Playwright reliably:

- Railway
- Fly.io
- Render
- Self-hosted Docker VM

Avoid edge-only or lightweight serverless deployments for this app.

## Notes on adapters

- Adapter families are separated by ATS type plus company-specific custom modules.
- The scraper prefers public JSON or static HTML first, then falls back to Playwright when needed.
- Some company-specific career surfaces may need parser tuning over time as public markup changes.
