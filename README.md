# Weather-Enriched Order Processor

A production-grade Node.js script that processes customer orders and enriches them with real-time weather intelligence from the OpenWeatherMap API. Orders destined for cities experiencing adverse weather are automatically flagged as delayed, with personalized customer notifications generated.

## Features

- **Concurrent weather fetching** — Uses `Promise.allSettled` with city deduplication and batching to maximize throughput
- **Weather-aware delivery logic** — Automatically delays orders when destination city has Rain, Snow, Thunderstorm, Drizzle, or Extreme conditions
- **Personalized apology messages** — Generates human-friendly delay notifications per customer
- **Retry with exponential backoff** — Transient failures (network errors, rate limits, 5xx) are retried up to 3 times with jitter
- **Graceful degradation** — Invalid cities or failed API calls don't halt processing; remaining orders continue normally
- **Secure configuration** — API key managed via `.env` file, never hardcoded
- **Input validation** — JSON structure validated before processing
- **Structured logging** — Timestamped info/warn/error output

## Project Structure

```
├── index.js              # Entry point and orchestrator
├── lib/
│   ├── logger.js         # Timestamped console logger (info, warn, error)
│   ├── retry.js          # Generic retry with exponential backoff + jitter
│   ├── validator.js      # Order JSON schema validation
│   ├── weather.js        # OpenWeatherMap API client (batched, concurrent)
│   └── delivery.js       # Weather-to-status mapping + apology messages
├── orders.json           # Input/output order data
├── .env                  # API key configuration (gitignored)
├── AI_LOG.md             # Design prompts and architectural decisions
└── package.json
```

## Prerequisites

- **Node.js** v14 or higher
- **OpenWeatherMap API key** — [Get a free key here](https://openweathermap.org/appid)

## Setup

```bash
# Install dependencies
npm install

# Configure your API key
echo "OPENWEATHERMAP_API_KEY=your_actual_key" > .env
```

## Usage

```bash
node index.js
```

### Input Format (`orders.json`)

```json
[
  {
    "order_id": "ORD-001",
    "customer": "Alice Johnson",
    "city": "London",
    "status": "Processing"
  }
]
```

### Output (after processing)

```json
[
  {
    "order_id": "ORD-001",
    "customer": "Alice Johnson",
    "city": "London",
    "status": "Delayed",
    "weather": {
      "main": "Rain",
      "description": "moderate rain",
      "temperature": 12.4
    },
    "delay_reason": "Rain",
    "apology_message": "Hi Alice, your order to London is delayed due to rain conditions. We appreciate your patience and will update you once it's on its way!",
    "processed_at": "2026-03-24T10:00:00.000Z"
  }
]
```

## Error Handling

| Scenario | Behavior |
|---|---|
| Missing/placeholder API key | Exits with clear error message |
| Invalid JSON in `orders.json` | Exits with parse error details |
| Invalid city name | Logs warning, marks weather as `"unavailable"`, continues |
| Network timeout / 5xx | Retries up to 3 times with exponential backoff |
| Rate limit (429) | Retries with backoff; batching (10/batch) prevents most 429s |
| Bad API key (401) | Fails immediately without retrying |

## Architecture Decisions

| Decision | Rationale |
|---|---|
| `Promise.allSettled` over `Promise.all` | One failed city doesn't block the rest |
| City deduplication before fetching | 50 orders to 8 cities = 8 API calls, not 50 |
| Batch size 10 + 1s gap | Stays under OpenWeatherMap's 60 calls/min free tier limit |
| `axios` for HTTP | Better timeout control and error objects than native `fetch` |
| Manual validation over Joi/Zod | Only 4 fields — a schema library would be overkill |

## Dependencies

| Package | Purpose |
|---|---|
| [dotenv](https://www.npmjs.com/package/dotenv) | Load environment variables from `.env` |
| [axios](https://www.npmjs.com/package/axios) | HTTP client with timeout and error handling |

## License

ISC
