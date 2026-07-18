# CLAUDE.md

**LearnKit** — a neuroinclusive-coursework kit: an evidence-based instructional-design spec, a machine-readable rule set, and CLI auditors that check course content and delivery-layer CSS against those rules. Turns "make it pedagogically sound and neuroinclusive" into enforceable lint rules. TypeScript (ESM), run via `tsx`; no build step.

## Architecture

Two layers: **rules as data** (`docs/`) and **auditors as code** (`src/`, `bin/`).

- `docs/RULES.json` — the single source of truth: every rule as `{ id, scope, tier, sourceUrl, check, before/after/why }`. The auditors read this.
- `docs/SOURCE_OF_TRUTH.md` — the full spec: evidence-labeling protocol, prohibited outputs, backward-design pipeline, ~57 rules.
- `docs/CONTENT_SCHEMA.md` — the JSON shape a content pipeline must emit for the content auditor.
- `docs/RESEARCH.md` — how the rules were produced (fan-out research + 3-vote adversarial verification) and how to extend them.
- `src/audit-content.ts` — content auditor; exports `auditCourse` / `loadCourses` and runs as a CLI. Checks lessons, objectives, questions.
- `src/audit-platform.ts` — delivery-layer auditor; checks CSS/design-token accessibility (`--dir`).
- `src/index.ts` — package entry re-exporting the importable API (`main` in package.json).
- `bin/learnkit.ts` — CLI dispatcher: `audit` / `audit-platform` / `rules`.
- `examples/sample-course.json` — gold-standard fixture that MUST audit with zero findings.
- `tests/audit.test.ts` — guards that the sample stays clean.

Every audit ends with a **coverage footer** listing rules it could not check automatically (platform/pipeline/human-review) so it never overstates what passed.

## Commands

```bash
npm install
npm run audit:sample     # audit the bundled sample course — expect 0 findings, exit 0
npm test                 # vitest run — guards the sample stays clean
npm run typecheck        # tsc --noEmit
npm run rules            # list the rule set (57 rules + 7 prohibited patterns)
npx tsx src/audit-content.ts path/to/your-course.json   # audit your own content
npx tsx src/audit-platform.ts --dir path/to/styles      # audit a delivery layer's CSS/tokens
```

## Conventions

- **Rules live in `docs/RULES.json`; logic lives in `src/`.** To add or change a rule: edit the JSON (always include `before`/`after`/`why`), then, if it is content-auto-checkable, implement its `check` in `src/audit-content.ts`.
- **Evidence discipline:** every rule carries a `tier` (`strong` / `moderate` / `contested` / `inference`) and a `sourceUrl`. Never promote `contested` → `strong` without a source and a test plan.
- **Keep the coverage footer honest** — anything the auditor can't verify must be listed, not silently passed.
- **ESM only** (`"type": "module"`): use `import.meta.url`, never `__dirname` / `require`.
- Licensing is split: **code** (`src/`, `bin/`, `tests/`, config) is MIT (`LICENSE`); **docs/examples** (`docs/`, `README.md`, `examples/`) are CC BY 4.0 (`LICENSE-docs`).

## Gotchas & Constraints

- The sample course is a **regression fixture** — if a rule change makes `examples/sample-course.json` report findings, either the sample or the rule is wrong. `npm test` will catch it.
- LearnKit hard-refuses plausible-sounding myths (learning styles, dyslexia-specific "treatment" fonts, single high-contrast-only themes, "faster feedback always wins"). Don't add rules that reintroduce them — see `docs/SOURCE_OF_TRUTH.md` §1–§2.
- No compile/bundle step and no runtime deps — everything runs through `tsx`. Keep it that way unless the user asks to add a build.
- Repo is currently **private**; it was extracted and generalized from an production cert-course platform — keep it subject-neutral (no product-specific content).
