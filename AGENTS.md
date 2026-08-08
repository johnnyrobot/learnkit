# AGENTS.md

LearnKit is a neuroinclusive-coursework kit — an evidence-based instructional-design specification, a machine-readable rule set (`docs/RULES.json`), and two CLI auditors that check course content and delivery-layer CSS against those rules. It is meant to be embedded in content pipelines (LLM generators, LMS/authoring tools) as a build gate. **Stack:** TypeScript, ES modules, executed with `tsx` (no compile step); tests via Vitest. Zero runtime dependencies.

## Setup

```bash
npm install
```

That installs the dev toolchain (`tsx`, `typescript`, `vitest`, `@types/node`). There is nothing to build — the CLIs and library run straight from TypeScript source via `tsx`.

## Build & Run

No build step. Run the auditors directly:

```bash
npm run audit                                  # content auditor (pass a path, or a bundle)
npm run audit:sample                           # audit the bundled sample course (0 findings, exit 0)
npm run audit:flawed                           # audit the counter-example (findings everywhere, exit 1)
npm run audit:platform                         # delivery-layer (CSS/token) auditor
npm run rules                                  # print the rule set + prohibited patterns
npx tsx src/audit-content.ts path/to/course.json
npx tsx src/audit-platform.ts --dir path/to/styles
```

Use it as a build gate by importing the API:

```ts
import { auditCourse, loadCourses } from "learnkit"; // or "./src/audit-content"
```

Fail the build when any finding has `severity === "error"`.

## Testing

```bash
npm test           # vitest run — both fixtures, shape validation, coverage-footer honesty
npm run typecheck  # tsc --noEmit
```

Tests live in `tests/`. Two paired fixtures carry the core guarantee: `examples/sample-course.json` must stay clean, and `examples/flawed-course.json` must keep tripping every implemented rule — the second exists because "the sample is clean" is equally satisfied by an auditor that checks nothing. Do not repair the flawed course; its problems are the fixture. **Before a change is done:** `npm test` passes, `npm run typecheck` is clean, `npm run audit:sample` reports 0 findings, and `npm run audit:flawed` still reports findings. When you add or modify a rule, add or update a case in `tests/audit.test.ts`.

## Code Style

- ESM only (`"type": "module"`) — use `import.meta.url`, never `__dirname` or `require`.
- **Separation of concerns:** rule *definitions* are data in `docs/RULES.json`; rule *logic* is code in `src/audit-content.ts` / `src/audit-platform.ts`. Add a rule by editing the JSON first (with a `before`/`after`/`why` example), then wiring its `check`.
- Every rule must carry an evidence `tier` (`strong`/`moderate`/`contested`/`inference`) and a `sourceUrl`. Keep each auditor's coverage footer accurate — list what it cannot auto-check.
- The content footer reports from `IMPLEMENTED_CONTENT_RULES` in `src/audit-content.ts`, not from RULES.json's `automatable` flag: the flag says a rule *could* be automated, the list says it *is*. Implementing a rule means adding its id there **and** making the flawed fixture trip it.
- A bad input must never audit clean. Unrecognized shapes are refused at load; drifted field names and empty courses report as `SCHEMA` findings. See `docs/CONTENT_SCHEMA.md` § Shape validation.
- Do not reintroduce refuted patterns (learning styles, dyslexia "treatment" fonts, single high-contrast-only themes, "faster feedback always wins") — see `docs/SOURCE_OF_TRUTH.md` §1–§2.

## Commit & PR Conventions

Git repo (`main`, origin `github.com/johnnyrobot/learnkit`). Branch off `main`; ensure `npm test` + `npm run typecheck` pass before opening a PR. Nice-to-haves on the backlog: a deliberately-flawed counter-example course, `CONTRIBUTING.md`, and a CI workflow running audit + tests on push. Commit or push only when the user asks.

## Security & Data

- No secrets, no network calls, no runtime dependencies — the auditors read local JSON/CSS and emit findings. Nothing to leak.
- **Licensing is split and must be respected:** code (`src/`, `bin/`, `tests/`, config) is MIT (`LICENSE`); docs, README, and examples are CC BY 4.0 (`LICENSE-docs`). Cited external standards/research stay attributed, not relicensed.
- Keep content subject-neutral: the kit was generalized from a production cert-course platform and must not carry product-specific material, or name the platform or the organization it belonged to.
