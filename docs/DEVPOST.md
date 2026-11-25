# Devpost submission text

**Title:** Séance: talk to the dead web
**Tagline:** Find the dead links in anything you've written and raise them from the Internet Archive's Wayback Machine.
**Category:** Resurrection
**Try it:** https://seance-sqcf.onrender.com (no login needed; click "Try a haunted README")
**Code:** https://github.com/Chetansahney/seance
**Video:** https://youtu.be/3w3kBzwGrLQ

## About the project (paste everything below into "About the project")

## Inspiration
Links are the web's memory, and they're dying. Domains lapse, companies shut down, and docs get reorganized. Studies of Wikipedia references, court opinions, papers and READMEs keep finding that a large share of links stop working within a few years. Yet most of those pages aren't really gone: the Internet Archive has been saving copies for nearly 30 years. Nobody goes to fetch them.

I tested an old README, a reading list about the early social web. **Six of its ten links were dead**: Yahoo! Pipes, Picasa, Google Reader, Megaupload, an old Firefox SDK page and Google Wave. Nobody had noticed. That's the dead technology Séance brings back to life: the old web, one link at a time.

## What it does
Paste a document or give Séance a URL, and it holds a séance for every link:

- **Summon:** finds every link (Markdown, HTML, bare URLs).
- **Check the pulse:** knocks politely (HEAD, then GET, at most two requests per site at a time, respecting robots.txt and backing off on 429) and streams each answer live into a graveyard.
- **Bury the dead:** only with proof: 400, 404, 410, vanished domains, broken DNS, timeouts and 5xx. Sites that merely block bots (403, 429, non-standard codes) stay *in the fog*, because rewriting a working link is worse than doing nothing.
- **Resurrect:** asks the Wayback Machine for each dead link's **last healthy snapshot**, never the archived copy of its 404 page.
- **Exorcise:** gives the document back with dead links rewritten and nothing else changed, plus a shareable "certificate" link.

The spooky theme carries meaning: a ghost means resurrected, a cracked tombstone means beyond reach, fog means uncertain, a candle means alive. It still respects reduced motion, meets WCAG AA contrast and works with a keyboard.

The same engine runs as a **CLI** (`node bin/seance.js README.md --fix`) and as a **GitHub Action**, so the next dead link fails your pull request instead of failing your readers.

## How I built it
Node.js with **zero runtime dependencies**: built-in `fetch`, Server-Sent Events for live results, plain HTML/CSS/JS for the UI, the Wayback Machine's CDX API for snapshots, and fast-check for property-based tests.

The project is defined by a **Kiro spec**: requirements as EARS acceptance criteria, a design with seven numbered correctness properties (each one a fast-check test), and a task list where every task cites its requirement. Tasks 1–11 (the core) were written before Kiro was installed, and task 15 (deploying to Render) was done by hand. Tasks 12, 13, 14 and 16 (GitHub Action, shareable certificate, robots.txt and 429 backoff, accessibility audit) ran through Kiro's spec workflow in the Kiro IDE, with an AI coding assistant at the keyboard clicking *Start task*, reviewing Kiro's changes, and approving or denying each command. Details and screenshots are in `docs/KIRO_USAGE.md`.

- **Steering** enforced "zero runtime dependencies". Kiro's first plan for the GitHub Action installed `@actions/core`; the install was denied with a pointer to the steering doc, and Kiro rewrote it as about 25 lines of YAML that call the existing CLI.
- **Agent hooks** fired on their own. The *tests* hook ran the suite after a core edit and caught a bug: a server answering "429, too busy" was still sent a second request. Kiro fixed the code, not the test. The *accessible horror* hook computed contrast (12.5:1) and checked reduced motion when a button was added.
- **Spec mode** proposed a file-by-file plan before editing, and requirement changes landed in the same change as the code.
- **Tests:** 39 unit and property tests, plus an axe audit in Microsoft Edge with zero violations.

## Challenges I ran into
- **Telling "dead" from "blocked".** Many sites return 403 to bots. Seized domains like megaupload.com don't answer "not found" in DNS: their name servers fail forever (SERVFAIL). Hacker News answers bots with a non-standard 419.
- **Choosing the right snapshot.** The newest Wayback capture of a dead page is usually the 404 page itself, so Séance only accepts captures that returned a 2xx status.
- **Rewriting safely.** `https://a.com/x` must never corrupt `https://a.com/xyz`, and running the fix twice must change nothing. Both are property-tested.
- **robots.txt edge cases.** Medium's robots.txt blocks one AI crawler and then starts the `*` group with no blank line between them. A naive parser merges the groups and blocks everything. Following RFC 9309 fixed it, and a new property test guards it.
- **Hosting safely.** The public server refuses private, loopback and cloud-metadata addresses, so it can't be used to probe the network it runs on.
- **Windows tooling.** Kiro ran on Windows PowerShell 5.1, where `&&` fails and `Set-Content` adds byte-order marks. A steering note fixed most of it, but not all. Steering is guidance, so review the diff.

## What I learned
- Write your non-negotiables down once (spec, steering, hooks) instead of repeating them in every prompt.
- Hooks are the cheapest teammate: a one-sentence rule caught a real bug without anyone remembering to run the tests.
- The real world is the best test suite. The best bugs came from live websites, and property tests made sure they stayed fixed.

## What's next
Submitting still-alive pages to the Archive's "Save Page Now" before they die, scanning whole sites from a sitemap, and a browser extension that marks dead links as you read.

## Built with
node.js, javascript, html, css, server-sent-events, wayback-machine, internet-archive, fast-check, playwright, axe-core, kiro, render
