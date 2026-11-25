# How we used Kiro to build Séance

> ✍️ **Fill this in from your own Kiro sessions.** Judges score this section heavily, and they can
> tell the difference between a template and real experience. Replace every `TODO` with what
> actually happened, plus screenshots. Delete anything you didn't do.

## Kiro apps we used
- **Kiro IDE:** TODO (for example: spec workflow, hooks, the agent chat for UI work).
- **Kiro CLI:** TODO (for example: running the remaining spec tasks from the terminal, scripting checks).
- How they differed: TODO.

## Spec-driven development
The spec lives in [`.kiro/specs/seance`](../.kiro/specs/seance):
- `requirements.md`: 6 requirements, each with user stories and EARS acceptance criteria (WHEN / IF / WHILE … SHALL).
- `design.md`: architecture, components, and **7 numbered correctness properties** that map directly to property-based tests.
- `tasks.md`: an implementation plan where every task cites the requirement it satisfies.

Why it mattered: TODO. Ideas to check against your experience:
- Writing "never resurrect a link as its own archived 404 page" as acceptance criterion 3.2 led straight to filtering
  Wayback captures by status, which a quick vibe-coded version would have missed.
- Deciding early that 403 and 429 are "unknown", not "dead" (Req 2.5), kept the tool honest.
- Spec vs vibe coding: TODO.

## Steering docs
[`.kiro/steering`](../.kiro/steering) has three always-included docs:
- `product.md`: product principles ("never lie about a link", "the spooky theme must carry meaning", "accessible horror").
- `tech.md`: zero runtime dependencies, pure core vs injected I/O, and a test convention that every pure function needs a property test.
- `structure.md`: where things live.

The strategy that made the biggest difference: TODO.

## Agent hooks
In [`.kiro/hooks`](../.kiro/hooks):
| Hook | Trigger | What it does |
|---|---|---|
| Run tests on core change | a file in `src/**` is edited | runs `npm test`, fixes the code unless the test contradicts the spec |
| Property test guard | a file in `src/core/**` is edited | makes sure every exported function has a fast-check property from the design |
| Accessible horror check | a UI file is edited | checks reduced motion, AA contrast and keyboard access |
| Keep tasks in sync | a source file is created | ticks off or adds the matching task in `tasks.md` |

What they caught: TODO (concrete examples are gold here).

## Property-based testing
`test/core.prop.test.js` checks the 7 properties from `design.md` at 500 runs each:
extraction soundness and completeness, rewrite preservation, idempotence and locality, snapshot validity and classification totality.
What PBT caught that unit tests missed: TODO.

## MCP
TODO (for example: a fetch MCP server to look at real Wayback CDX responses while designing the client,
or the GitHub MCP to open issues for each spec task).

## Kiro powers / custom agents / Kiro Crew
TODO (only include what you actually used).
