# How Kiro was used to build Séance

> **Read before submitting.** This write-up records what happened in the Kiro IDE on Nov 25, 2026.
> In those sessions, an AI coding assistant (Claude, using desktop control) clicked Kiro's buttons,
> typed the follow-up prompts and approved or denied each of Kiro's tool calls, while the project's
> owner watched. Tasks 1–11 were written *before* Kiro was installed, outside Kiro.
> Keep that disclosure in your submission, and add your own sessions in Kiro (marked ✍️) so you
> can speak to the workflow first-hand.

## At a glance

| | |
|---|---|
| Kiro app | Kiro IDE 1.4.236 on Windows 11 (no CLI or Kiro Crew yet) |
| Spec tasks done in Kiro | 12, 13, 14, 16 (task 15, deploy, needs a Render account) |
| Hooks that fired on their own | 3 of 4: *Run tests on core change*, *Accessible horror check*, *Keep tasks in sync* |
| Bugs caught during the Kiro sessions | 5 (listed below) |
| Tests | 23 → **39** unit and property tests, plus **2** axe audits in Edge |
| Credits | about 11.5, by Kiro's per-run estimates |

Screenshots of each moment are in [`docs/kiro/`](kiro/).

## Spec-driven development

The spec in [`.kiro/specs/seance`](../.kiro/specs/seance) has three parts:
- **`requirements.md`**: user stories with EARS acceptance criteria (WHEN … THEN the system SHALL …).
- **`design.md`**: components, plus 7 numbered correctness properties, each backed by a fast-check test.
- **`tasks.md`**: an implementation plan in which each task cites the requirement it satisfies.

Kiro recognized the spec as soon as the folder opened (Requirements → Design → Task list), and every task ran from its
**Start task** button. Each run is recorded in `tasks.meta.json`.

What the spec workflow changed in practice:
- **It planned before editing.** When given two bugs mid-task, Kiro in Spec mode answered with a table of
  file-by-file changes and asked *"Want me to proceed?"* before touching code
  ([screenshot 07](kiro/07-spec-mode-plan-before-edit.jpg)).
- **The requirements moved with the code.** When real-site testing showed the "dead" rule was too broad,
  Kiro updated **Requirement 2** in the same change: 2.3 and 2.5 now say only 400, 404 and 410 are dead
  and every other 4xx is unknown, and a new 2.7 covers robots.txt. The spec stays the source of truth
  instead of drifting from the code.

## Steering

Three always-included docs live in [`.kiro/steering`](../.kiro/steering): `product.md` (principles), `tech.md` (stack
and conventions) and `structure.md` (layout).

- **"Zero runtime dependencies" stopped an unwanted dependency.** In task 12, Kiro first planned to
  `npm install @actions/core` for the GitHub Action ([screenshot 02](kiro/02-task12-steering-conflict-actions-core.jpg)).
  The install was denied with a pointer to `tech.md`, and Kiro rewrote the action as a composite action
  that shells out to the existing CLI. It then noticed it had already added `@actions/core` to
  `package.json` and removed it on its own.
- **"Never lie about a link" (`product.md`) settled a judgment call.** Hacker News answers bots with a non-standard
  419. Under that principle, Kiro classed it as *unknown*, not *dead*.
- **We added a Windows section to steering after Kiro hit PowerShell limits.** Kiro twice used `&&`, which
  Windows PowerShell 5.1 rejects, and wrote files with `Set-Content`, which adds a byte-order mark and CRLF line endings
  (this broke `action.yml`). We added a *"Working on this machine (Windows)"* section to `tech.md`.
  **This only partly worked:** later edits used Kiro's own *Replace in File* tool, but a sub-agent in task 14
  still used `Set-Content`, and the files had to be cleaned up afterwards. Steering is guidance, not a guarantee.

## Agent hooks

| Hook | Trigger | What happened |
|---|---|---|
| **Run tests on core change** | edit in `src/**` | Fired during task 14, ran the suite and **caught a real bug**: a 429 from HEAD fell through to GET, hitting a rate-limited server twice. Kiro fixed the code rather than the test, as the hook prompt says ([05](kiro/05-hook-tests-fire-on-src-edit.jpg), [06](kiro/06-hook-tests-catch-429-bug.jpg)). |
| **Accessible horror check** | edit in `public/**` | Fired during task 13 when the Share button was added. It computed WCAG contrast itself (12.5:1 text, 12.5:1 focus ring), checked reduced motion and keyboard access, and reported no fixes needed ([03](kiro/03-hook-accessible-horror-fires.jpg), [04](kiro/04-hook-accessible-horror-verdict.jpg)). |
| **Keep tasks in sync** | new file in `src/`, `bin/`, `public/` | Fired when task 14 created `robots.js`. |
| **Property test guard** | edit in `src/core/**` | Not seen firing in these sessions. ✍️ |

Hook improvement: the tests hook kept prefixing `cd … &&`, so its prompt now asks for a single command.

## Property-based testing

`test/core.prop.test.js` checks the 7 design properties at 500 runs each (extraction soundness and completeness, rewrite
idempotence and locality, snapshot validity, classification totality). In task 14, Kiro added a new property: *rules in
another agent's robots.txt group never affect the `*` result* (500 runs).

Honest note: the robots.txt bug was found by **testing against live sites**, not by PBT. The property was written
afterwards to lock in the fix, and it now guards against the regression.

## Bugs found during the Kiro sessions

1. **Script injection risk in `action.yml`.** `${{ inputs.files }}` was pasted straight into the shell script; Kiro moved inputs to `env:`.
2. **`set -e` stopped at the first failing file.** Kiro changed the action to scan every file, then fail at the end.
3. **A shared certificate offered an empty download.** A restored permalink showed *Download*, with no document behind it. Fixed by Kiro.
4. **A 429 from HEAD fell through to GET.** Caught by the tests hook and fixed by Kiro.
5. **robots.txt groups were merged** when no blank line separated them, so Medium's block on one AI crawler applied to everyone
   (RFC 9309 says a `User-agent` line after rules starts a new group). Kiro also added support for `Allow:` (longest match wins).

## Accessibility audit (task 16)

Kiro added Playwright and `@axe-core/playwright` as **dev-only** dependencies, pointed at the installed Microsoft Edge rather than downloading a
browser, and wrote `scripts/a11y-audit.spec.js`. It audits the home page and the results page after a real scan. Result: **zero axe
violations**, with no fixes needed ([08](kiro/08-task16-axe-zero-violations.jpg)). Run it with `npm run test:a11y`.

## Vibe coding vs spec-driven

✍️ Your own comparison. One concrete contrast from these sessions: the first, unguided attempt at the GitHub Action reached for a
new dependency and a bundling step. With the spec and steering in place, the same task became 25 lines of YAML.

## MCP, powers, custom agents, Kiro Crew

Not used yet. ✍️ If you add an MCP server (for example GitHub, to open an issue per spec task) or try Kiro Crew, describe it here.
