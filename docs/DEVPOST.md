# Devpost submission text (draft)

**Title:** Séance: talk to the dead web
**Tagline:** Find the dead links in anything you've written and raise them from the Internet Archive.
**Category:** Resurrection

## Inspiration
Links are the web's memory, and they're dying. Domains lapse, companies shut down, and docs get
reorganized. Research on link rot keeps finding the same thing: a large share of links in
Wikipedia references, court opinions, papers and READMEs stop working within a few years. The content often
still exists, in the Internet Archive, but nobody goes to fetch it. We wanted a tool that holds a séance for every link
in a document and brings the dead ones back.

## What it does
Paste a document or give Séance a URL. It:
- finds every link (Markdown, HTML, bare URLs),
- checks each one politely and streams results live into a graveyard,
- separates the truly dead (404, 410, vanished domains, broken DNS, timeouts, 5xx) from links that are merely blocked (403, 429), which it never calls dead,
- asks the Wayback Machine for each dead link's **last healthy snapshot**, never the archived copy of its 404 page,
- gives you the document back with dead links rewritten and nothing else changed.

A CLI (`seance README.md --fix`) brings the same thing to CI, failing the build when a link dies.

## How we built it
TODO: summarize docs/KIRO_USAGE.md in 4–6 sentences (spec, steering, hooks, PBT, MCP).
Node.js with zero runtime dependencies, Server-Sent Events for live results, plain HTML/CSS/JS for the UI,
and fast-check for property-based tests of every correctness property in the design.

## Challenges
- Telling "dead" from "blocked": many sites return 403 to bots, and seized domains like megaupload.com
  return DNS SERVFAIL forever rather than "not found".
- Choosing the right snapshot: the newest Wayback capture of a dead page is usually the 404 page itself.
- Rewriting safely: `https://a.com/x` must never corrupt `https://a.com/xyz`, and running the fix twice must change nothing.
- Hosting safely: refusing private and loopback addresses so the public server can't be used to probe its own network.

## Accomplishments
- Seven correctness properties, each verified with property-based tests.
- A spooky UI where every effect means something (ghost = resurrected, cracked stone = lost, fog = uncertain, candle = alive),
  which still respects reduced motion, meets AA contrast and works with a keyboard.

## What's next
A GitHub Action, robots.txt support, a per-host backoff, and submitting live pages to "Save Page Now" before they die.

## Built with
node.js, javascript, html, css, server-sent-events, internet-archive, wayback-machine, fast-check, kiro
