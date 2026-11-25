# Design: Séance

## Overview
A single Node.js process with no runtime dependencies serves a static haunted UI and
a streaming scan API. Pure logic lives in `src/core/` and network access in `src/net/`,
so the core can be property-tested without a network.

```
 input (text | url)
   │
   ▼
 extractLinks()  ──►  dedupe  ──►  probe pool (8 global / 2 per host)
                                         │
                       alive / unknown ◄─┤
                                         ▼ dead
                                 wayback CDX lookup
                                         │
                         chooseSnapshot() ──► resurrected | lost
                                         │
                                         ▼
                                  rewrite(text, map)
```

## Components

### `src/core/extract.js`
`extractLinks(text) → Array<{ url, index }>`. One regex pass finds every `http(s)://` run,
which covers Markdown inline links, reference links, autolinks, bare URLs and HTML attributes.
`trimTrailing(url)` strips unbalanced trailing punctuation and closing brackets or quotes.

### `src/core/classify.js`
`classify({ status?, error? }) → { state, reason }`. A pure mapping, as specified in Requirement 2.

### `src/core/snapshot.js`
`chooseSnapshot(rows) → { timestamp, original } | null`. Rows come from the CDX API
(`[urlkey, timestamp, original, mimetype, statuscode, digest, length]`). Picks the newest row with a 2xx status.
`archiveUrl(ts, url)` builds the Wayback URL.

### `src/core/rewrite.js`
`rewrite(text, Map<from, to>) → string`. Scans the text once, matching keys longest-first at
each position, so a URL that is a prefix of another is never corrupted. An occurrence only
counts when the URL ends there, and one already preceded by a `web.archive.org/web/<ts>/` prefix
is skipped, which makes the rewrite idempotent.

### `src/net/probe.js`
`probe(url, { fetchImpl, timeoutMs })`: HEAD, then a GET fallback, with an AbortController timeout.
`createPool({ global, perHost })` is a small concurrency limiter.

### `src/net/wayback.js`
`findSnapshots(url, { fetchImpl })` calls
`https://web.archive.org/cdx/search/cdx?url=<url>&output=json&limit=-25`.

### `src/scan.js`
`scan(text, { onEvent, probeImpl, waybackImpl })` ties it together and emits `found`, `result` and `done` events.

### `src/server.js`
- `GET /` serves `public/`.
- `POST /api/scan` takes `{ text }` or `{ url }` and responds with an SSE stream of events.
- `GET /healthz`.

## Correctness properties (for PBT)
1. **Extraction soundness:** every extracted URL is a substring of the input at its reported index and starts with `http`.
2. **Extraction completeness:** for any generated URL embedded in random prose as `[x](url)`, the URL is extracted exactly.
3. **Rewrite preservation:** `rewrite(t, ∅) === t`.
4. **Rewrite idempotence:** `rewrite(rewrite(t, m), m) === rewrite(t, m)`.
5. **Rewrite locality:** text that contains no mapped URL is returned unchanged.
6. **Snapshot validity:** `chooseSnapshot` returns either null or the 2xx row with the newest timestamp.
7. **Classification totality:** every integer status 100–599 maps to exactly one state.

## Error handling
Network errors become `{ state: 'dead' | 'unknown', reason }`. The SSE stream always ends with `done`.
