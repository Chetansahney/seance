---
inclusion: always
---
# Repository structure

```
.kiro/            specs, steering and hooks (do not gitignore)
bin/seance.js     CLI entry point
src/core/         pure logic: link extraction, classification, rewriting, snapshot choice
src/net/          probing links and querying the Wayback Machine
src/server.js     HTTP server: static files plus /api/scan (Server-Sent Events)
public/           haunted UI (index.html, styles.css, app.js)
test/             node:test files; *.prop.test.js are property-based tests
docs/             Devpost text, Kiro write-up, video script
```

When adding a feature, update `.kiro/specs/seance/tasks.md` and add tests in `test/`.
