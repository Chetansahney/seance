---
inclusion: always
---
# Tech stack and conventions

- **Runtime:** Node.js 20 or newer, ES modules only (`"type": "module"`).
- **Zero runtime dependencies.** Use built-in `fetch`, `node:http`, `node:test`. The only dev dependency is `fast-check` for property-based tests.
- **Frontend:** plain HTML, CSS and JS in `public/`. No framework and no build step.
- **Core logic stays pure.** Anything in `src/core/` takes no I/O and is deterministic. Network code lives in `src/net/` and is injected, so tests can fake it.
- **Tests:** `npm test` runs `node --test`. Every pure function gets example tests **and** at least one fast-check property.
- **Errors:** never throw across the HTTP boundary. Return a structured `{ status, reason }`.
- **Style:** two-space indent, single quotes, JSDoc types on exported functions.

## Working on this machine (Windows)
- The terminal is **Windows PowerShell 5.1**: `&&` is not supported. Run one command per step, or separate commands with `;`.
- Create and edit files with the file-writing tool, **not** `Set-Content`/`Out-File`: PowerShell 5.1 adds a UTF-8 BOM and CRLF line endings, which break YAML and shell files. The repo uses LF (see `.gitattributes`).
