# Blog post

Rules: publish on a public third-party platform (dev.to, Medium, Hashnode…) during the submission period, about Kiro
**and** your project, saying it was written for the Kiroween 2026 hackathon. Put the URL in your Devpost submission.

Everything below matches what happened in the Kiro sessions (see `docs/KIRO_USAGE.md`). Copy everything below the line.
Suggested tags: `kiro`, `hackathon`, `webdev`, `javascript`.

---

# Holding a séance for the dead web: building a link-rot fixer with Kiro

*This post was written as part of the Kiroween 2026 hackathon.*

## Six of ten links were dead

I took an old README, a reading list about the early social web, and checked its links. Six of ten were dead:
Yahoo! Pipes, Picasa Web Albums, Google Reader, Megaupload, an old Firefox SDK page and a Google Wave landing page.
Nobody had noticed, because links don't fail loudly. They just stop.

This is link rot, and it's everywhere: documentation, academic citations, court opinions, Wikipedia references.
The good news is that most dead pages aren't really gone. The Internet Archive's Wayback Machine has been saving
copies for nearly 30 years. What's missing is a tool that goes and gets them.

## Séance

[Séance](https://seance-sqcf.onrender.com) holds a séance for every link in a document:

1. **Summon:** find every link (Markdown, HTML, bare URLs).
2. **Check the pulse:** knock politely (HEAD, then GET, at most two requests per site at a time, respecting robots.txt).
3. **Bury the dead:** 400, 404, 410, vanished domains, broken DNS, timeouts, 5xx.
4. **Resurrect:** fetch the link's last *healthy* snapshot from the Wayback Machine.
5. **Exorcise:** hand back the document with dead links rewritten, and nothing else touched.

![The Séance graveyard after a scan](https://raw.githubusercontent.com/Chetansahney/seance/main/docs/screenshot.png)

It runs as a web app, a command-line tool, and a GitHub Action that fails a pull request when a link dies.

🎥 2-minute demo: https://youtu.be/3w3kBzwGrLQ

## Three things that were harder than they looked

**"Dead" is a strong word.** Many sites return 403 to anything that looks like a bot, and 429 when busy.
Calling those dead would make Séance rewrite working links, which is worse than doing nothing. So Séance has a
third state, *in the fog*, and only buries a link with real evidence. Seized domains were a surprise: megaupload.com
doesn't answer "not found" in DNS. Its name servers fail forever (SERVFAIL).

**The newest snapshot is usually the wrong one.** When a page dies, the Wayback Machine keeps crawling it, so the most
recent capture is often the 404 page itself. Séance asks only for captures that returned a 2xx status and picks the
newest of those: the last time the page was alive.

**Rewriting text is easy to get subtly wrong.** A naive find-and-replace for `https://a.com/x` corrupts
`https://a.com/xyz`, and running the fix twice can archive an archive link. Séance only replaces whole extracted
links, and an archived link is extracted as a single link, so running the fix twice changes nothing.

## How Kiro shaped the build

A note on process: Kiro was installed partway through. The core (tasks 1–11 of the spec) was written before that,
outside Kiro. The remaining tasks (the GitHub Action, shareable certificates, robots.txt support and an accessibility
audit) ran through Kiro's spec workflow in the Kiro IDE, with an AI coding assistant at the keyboard clicking
*Start task*, reviewing Kiro's changes and approving or denying each command. Here's what stood out.

### The spec is a contract, and it moved with the code

The spec has three files: requirements written as EARS acceptance criteria ("WHEN a response is 404 or 410 THEN the
system SHALL classify the link as dead"), a design with seven numbered correctness properties, and a task list where
each task cites its requirement. Kiro picked the spec up as soon as the folder opened, and every task ran from its
*Start task* button.

Two moments showed why that matters. First, when two bugs came up mid-task, Kiro in Spec mode didn't start editing. It
answered with a file-by-file plan and asked *"Want me to proceed?"* Second, testing against real sites showed the
"dead" rule was too broad: Hacker News answers bots with a non-standard **419**, which Séance was calling dead. The
fix changed the classifier *and* Requirement 2 in the same change. Only 400, 404 and 410 now count as dead, and every
other 4xx is "unknown". The spec still says what the code does.

### Steering: write the rule once

Three steering docs are always included: product principles ("never lie about a link"), tech conventions, and the
repository layout.

The clearest win was in the GitHub Action task. Kiro's first plan was to `npm install @actions/core`. The steering doc
says **zero runtime dependencies**, so the install was denied with a pointer to that line, and Kiro rewrote the action
as about 25 lines of YAML that call the existing CLI. It even noticed it had already added the package to
`package.json` and removed it.

It wasn't perfect. Kiro ran on Windows PowerShell 5.1, which rejects `&&`, and it wrote some files with
`Set-Content`, which adds a byte-order mark and Windows line endings (enough to break a YAML file). A "Working on this
machine" section in steering fixed most of that: later edits used Kiro's own file tool. But a sub-agent in a later
task still fell back to `Set-Content`. Steering is strong guidance, not a guarantee, so review the diff.

### Hooks: the part that felt like a teammate

Four hooks live in `.kiro/hooks`, each a plain-English instruction tied to a file pattern. Three fired on their own:

- **Run tests on core change** (any edit in `src/`). While Kiro implemented robots.txt support, this hook ran the
  suite, a test failed, and Kiro traced it: when a server answered HEAD with *429, too busy*, the code still fell
  through to a GET, hitting a rate-limited server twice. Kiro fixed the code, not the test, as the hook instructs.
- **Accessible horror check** (any edit in `public/`). When the "Share this certificate" button was added, the hook
  worked out the WCAG contrast itself (12.5:1), confirmed animations respect `prefers-reduced-motion`, checked keyboard
  access, and reported that no fixes were needed.
- **Keep tasks in sync** fired when a new source file was created.

The fourth, a guard that every pure function has a property test, never fired in these sessions.

### Property-based tests, honestly

The seven design properties are fast-check tests at 500 runs each: extraction soundness, rewrite idempotence,
snapshot validity and so on. To be honest, the most interesting bug wasn't caught by them. A robots.txt parser bug was
found by **testing against live sites**: Medium's robots.txt blocks one AI crawler with `Disallow: /`, followed
immediately by `User-agent: *` with no blank line. The parser merged the two groups, so every Medium link looked
blocked. RFC 9309 says a `User-agent` line after rules starts a new group. Kiro fixed the parser, added support for
`Allow:` rules, and wrote a new property: *rules in another agent's group never affect the `*` result*. Now that bug
can't come back quietly.

### Accessibility audit

The last task asked Kiro for an axe audit. It added Playwright and `@axe-core/playwright` as dev-only dependencies,
pointed them at the installed Microsoft Edge (no browser download), and audited the home page and a finished scan.
Result: zero violations. The spooky theme stays usable: every animation turns off under reduced motion, and text
contrast stays above WCAG AA.

### What I'd tell someone starting with Kiro

Put your non-negotiables in steering and your definition of done in hooks, then let the spec drive. And keep testing
against the real world: the best bugs here came from real websites, and the spec and property tests made sure they
stayed fixed.

## Try it

- Live: https://seance-sqcf.onrender.com (free hosting, so the first visit may take a moment to wake it)
- Demo video: https://youtu.be/3w3kBzwGrLQ
- Code (MIT): https://github.com/Chetansahney/seance
- In CI: add the `Chetansahney/seance@main` GitHub Action, or run `node bin/seance.js README.md` (exits with code 1 when a link dies; `--fix` rewrites it)

And if Séance saves one of your links, consider [donating to the Internet Archive](https://archive.org/donate). They did the hard part.
