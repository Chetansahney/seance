---
inclusion: always
---
# Product: Séance — talk to the dead web

Séance finds dead links in a document or web page and brings them back from the
Internet Archive's Wayback Machine.

## Users
- Docs maintainers and open-source authors whose READMEs and docs rot.
- Researchers, students and journalists with citation lists.
- Bloggers and Wikipedia editors.

## Principles
- **Never lie about a link.** A link is "dead" only if we have evidence: an HTTP status, a DNS failure or a timeout. Report "unknown" otherwise (for example 403 from bot protection, or 429).
- **Prefer the last living snapshot.** Pick the archived copy from just before the link died, not the newest copy (which is often the 404 page).
- **The spooky theme must carry meaning.** Graves mean dead links, ghosts mean resurrected links, and living links stay in the light. Never let decoration hide information.
- **Accessible horror.** Every animation respects `prefers-reduced-motion`, contrast meets WCAG AA, and the app works with a keyboard only.
- **Be a polite crawler.** Limit concurrency, send a clear User-Agent, and never hammer a single host.
