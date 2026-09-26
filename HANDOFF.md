# LearnKit — contributor handoff

A short orientation for anyone picking up this repo (or a fork). For the full spec see
[`docs/SOURCE_OF_TRUTH.md`](docs/SOURCE_OF_TRUTH.md); for the "why it's trustworthy" story see
[`docs/RESEARCH.md`](docs/RESEARCH.md).

## What this is

A neuroinclusive-coursework kit: an evidence-based instructional-design spec, a machine-readable rule
set, and auditors that check course content and delivery UIs against those rules. Goal — make
"pedagogically sound and accessible to neurodivergent learners" enforceable, not aspirational.

## Origin

Extracted and generalized from a working NVIDIA certification-course platform. It started as an audit of
the *Leantime Neuroinclusive App Design Reference Guide*, then expanded via a multi-agent research pass
(6 angles → 76 claims → 31 survived 3-vote adversarial verification). All NVIDIA-specific content was
removed; the one product-flavored example was swapped to a neutral subject (photosynthesis).

## Layout

| Path | Role |
|---|---|
| `docs/SOURCE_OF_TRUTH.md` | The spec: labeling protocol, prohibited outputs, pipeline, ~57 rules. |
| `docs/RULES.json` | Rules as data (`id/scope/tier/sourceUrl/check` + `before`/`after`/`why`). Single source of truth for the auditors. |
| `docs/RESEARCH.md` | How the rules were produced + how to extend them. |
| `docs/CONTENT_SCHEMA.md` | The JSON the content auditor expects. |
| `src/audit-content.ts` | Content auditor (CLI + importable `auditCourse`/`loadCourses`). |
| `src/audit-platform.ts` | Delivery-layer (CSS/token) auditor. |
| `bin/learnkit.ts` | CLI dispatcher: `audit` / `audit-platform` / `rules`. |
| `examples/sample-course.json` | Gold-standard fixture — must audit with 0 findings. |
| `tests/audit.test.ts` | Guards the sample stays clean. |

## Verify (all should pass)

```bash
npm install
npm run audit:sample     # 0 findings, exit 0
npm test                 # sample stays clean
npm run typecheck        # clean
npm run rules            # lists 57 rules + 7 prohibited patterns
```

## Conventions

- **Rules live in `docs/RULES.json`, logic in `src/`.** To add/adjust a rule: edit the JSON (include a
  `before`/`after`/`why`) and, if it's content-auto-checkable, implement the `check` in
  `src/audit-content.ts`. Keep the auditor's coverage footer honest — list what it can't check.
- **Evidence discipline:** every rule carries a `tier` (`strong`/`moderate`/`contested`/`inference`) and
  a `sourceUrl`. Don't promote `contested` to `strong` without a source + test plan.
- **ESM:** `package.json` has `"type": "module"`; use `import.meta.url` (not `__dirname`/`require`).
- **Licensing:** code = MIT (`LICENSE`), docs/examples = CC BY 4.0 (`LICENSE-docs`).

## Open items

- Nice-to-have completed: deliberately-flawed counter-example course now added at
  `examples/flawed-counter-example-course.json`.
