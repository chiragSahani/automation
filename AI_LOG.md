# AI Log — Weather-Enriched Order Processor

## Design & Implementation Prompts

### 1. Parallel Fetching Logic

**Prompt:** *"Design a concurrent weather-fetching strategy that maximizes throughput while respecting OpenWeatherMap's free-tier rate limit of 60 requests/minute."*

**Design Decisions:**
- **City deduplication:** Before making API calls, extract unique cities from all orders using `new Set()`. If 50 orders reference 8 unique cities, we make 8 API calls — not 50.
- **`Promise.allSettled` over `Promise.all`:** `Promise.all` short-circuits on the first rejection, meaning one failed city would prevent results for all others. `Promise.allSettled` waits for all promises to settle, returning both fulfilled and rejected results.
- **Batch processing:** Cities are processed in batches of 10 with a 1-second gap between batches. This prevents hitting the 60 calls/minute rate limit while still achieving high concurrency within each batch.
- **Result aggregation:** Weather results are stored in a `Map<city, weatherData | null>` for O(1) lookup when enriching orders.

### 2. Error Handling & Resilience

**Prompt:** *"Implement fault-tolerant error handling that gracefully degrades on individual failures without stopping the pipeline."*

**Design Decisions:**
- **Three-tier error classification:**
  - **Fatal (halt):** Missing config (`.env`, API key), unparseable `orders.json`, validation failure. These call `process.exit(1)` because no meaningful work can be done.
  - **Degraded (continue):** Individual city weather fetch fails after retries. The order is still processed but with `weather: "unavailable"` — no data loss.
  - **Transient (retry):** Network timeouts, HTTP 429 (rate limit), 5xx server errors. Handled automatically by the retry module with exponential backoff.

- **Non-retryable error detection:** HTTP 404 (city not found) and 401 (bad API key) are marked with `error.retryable = false`, causing the retry loop to bail immediately. This avoids wasting time retrying permanent failures.

- **Exponential backoff with jitter:** Retry delays follow `baseDelay × 2^attempt × jitter(0.5–1.5)`. The jitter prevents thundering-herd scenarios where multiple failed requests retry simultaneously.

- **Graceful degradation principle:** The system processes every order it can. If weather data is unavailable for a city, the order retains its original status and is flagged accordingly. The final output always contains all orders.

### 3. Security Practices

**Prompt:** *"Ensure the API key is never exposed in source code or version control."*

**Design Decisions:**
- API key stored exclusively in `.env` file, loaded via `dotenv`.
- `.env` is listed in `.gitignore` to prevent accidental commits.
- Startup validation checks for missing or placeholder API keys before making any requests.

### 4. Modular Architecture

**Prompt:** *"Structure the codebase for readability and single-responsibility, without over-engineering for a script-level project."*

**Design Decisions:**
- Five focused modules in `lib/`: `logger`, `retry`, `validator`, `weather`, `delivery`.
- Each module exports pure functions (no classes, no singletons).
- `index.js` orchestrates the flow — read, validate, fetch, enrich, write — in a linear, readable sequence.
- No dependency injection or framework overhead; direct `require()` keeps things simple.
