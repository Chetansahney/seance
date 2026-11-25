# Kiroween 2026 — Submission Checklist for Séance

**Deadline: Friday, December 4, 2026, 2:00 PM Pacific.** (Today: Nov 25, so about 9 days left.)
Submission period: Oct 30 to Dec 4, 2026. The project must be **new** and built in that window.

## What we're building

**Séance: talk to the dead web.**
Category: **Resurrection** (with a UI good enough for the Costume Contest).

Link rot is a real, measurable problem. Studies of Wikipedia references, legal citations,
academic papers and READMEs find that a large share of links die within a few years.
Séance takes a URL, a Markdown/HTML document, or pasted text, then:

1. **Summons** every link (extraction).
2. **Checks the pulse** of each one (HEAD, falling back to GET; timeouts; redirects).
3. **Buries the dead** in a graveyard, one tombstone per broken link, with cause of death (404, DNS, timeout, 5xx).
4. **Resurrects** each dead link from the Internet Archive's Wayback Machine (a public dataset),
   picking the snapshot closest to when the link was last alive.
5. **Exorcises** the document: you download it with every dead link rewritten to its archived copy.

It comes as a web app and a CLI (`seance README.md --fix`), so it can run in CI.

## Requirements (from the official page)

| # | Requirement | Status |
|---|---|---|
| 1 | A working software application built **with Kiro** (IDE / CLI / Web / Crew) | ⏳ You must actually use Kiro; see the note below |
| 2 | Pick **one category**: Resurrection | ✅ Decided |
| 3 | Pick bonus prizes: Best Demo (automatic), Social Blitz, Bonus Blog, plus Student or Startup if eligible | ⏳ Your call |
| 4 | **Public GitHub repo** (not GitLab/Bitbucket) with all source, assets and instructions | ⏳ |
| 5 | An **OSI license** that GitHub detects and shows in the About section (MIT: `LICENSE`) | ✅ File added |
| 6 | `/.kiro` directory **at the repo root** (specs, hooks, steering), **not** gitignored | ✅ Scaffolded |
| 7 | **URL to the working app** (deployed), with test credentials in the Devpost form if needed (none needed) | ⏳ Deploy |
| 8 | **Text description** of features and functionality | ⏳ Draft in `docs/DEVPOST.md` |
| 9 | **Demo video** under 3 min, public on YouTube, showing it working, no copyrighted music | ⏳ Script in `docs/VIDEO_SCRIPT.md` |
| 10 | **Kiro write-up**: IDE/CLI, custom agents, hooks, specs, steering, MCP, PBT, powers | ⏳ Draft in `docs/KIRO_USAGE.md` |
| 11 | Team of at most 3, registered on Devpost | ⏳ |
| 12 | Read the [Official Rules](https://kiroween.devpost.com/rules) | ⏳ |

### Optional bonus prizes
- **Social Blitz**: a post that **starts with** `#KiroweenHackathon26`, saying your favorite thing about Kiro. Add the URL to the submission.
- **Bonus Blog**: a public blog post (dev.to, Medium, Hashnode) about Kiro and Séance that says it was written for Kiroween 2026.
- **Best Student Project: Resurrection**: every member must be a student. You need LinkedIn, student email, year, degree and school.
- **Best Startup**: only if you are a real founder (LinkedIn plus startup site).

## Judging criteria and how Séance targets each

| Criterion | Our angle |
|---|---|
| **Potential Impact** | Link rot hurts docs maintainers, researchers, Wikipedia editors, lawyers and bloggers. The CLI and `--fix` give them a fix they can use today, including in CI. |
| **Technological Implementation (Kiro)** | A full spec (EARS requirements, design, tasks), 3 steering docs, 4 hooks, PBT on the core library, and an MCP fetch/GitHub server. Write it up honestly. |
| **Design** | A haunted graveyard UI: tombstones, ghosts rising on resurrection, a candle-lit progress bar. Spooky, but each effect means something (dead = grave, archived = ghost). |
| **Innovation** | Combines live HTTP probing with the Internet Archive's public Wayback dataset, and picks the snapshot from the last date the link was alive instead of a random one. |
| **Presentation** | A 3-minute video: hook (a famous dead link), the problem, a live demo, the CLI in CI, then the Kiro story. |

## ⚠️ Important: Kiro must really be used

The judges score **how you used Kiro**. This repo's `.kiro/` folder holds a real spec, steering
docs and hooks, but the write-up has to describe **your own sessions in Kiro**. Before submitting:

1. Install Kiro (kiro.dev), open this repo, and let it pick up `.kiro/steering` and the spec.
2. Run the remaining tasks in `.kiro/specs/seance/tasks.md` (marked `[ ]`) **through Kiro's spec workflow**.
3. Turn on the hooks and let them fire while you work. Note what they caught.
4. Add an MCP server in Kiro (for example the fetch or GitHub MCP) and use it.
5. Take screenshots of all of this for the write-up and video.
6. Fill in `docs/KIRO_USAGE.md` with what actually happened. Don't claim anything you didn't do.

## Day-by-day plan (Nov 25 to Dec 4)

| Day | Work |
|---|---|
| Nov 25–26 | Core library, server, UI, tests (done in this session). Push to GitHub. |
| Nov 27–29 | Open in Kiro. Run the remaining spec tasks (CLI polish, GitHub Action, share links) with hooks and MCP. |
| Nov 30 | Deploy (Render, Railway or Fly; one Node process, no database). |
| Dec 1 | Polish the UI, accessibility pass, mobile. |
| Dec 2 | Record and edit the video. Write the blog post and social post. |
| Dec 3 | Fill in the Devpost form, final README, check the license shows in the About section. |
| Dec 4 (before 2 PM PT) | **Submit.** Don't leave it to the last hour. |
