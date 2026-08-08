# Contributing to LearnKit

Thanks for helping. LearnKit turns learning science into lint rules, so the bar for a change is
evidence, not preference.

## Setup

```bash
git clone https://github.com/johnnyrobot/learnkit.git && cd learnkit
npm install
npm test
```

Node 20 or later. Development needs no build — everything runs straight through `tsx`. `npm run build` exists only to produce the publishable `dist/`.

## Before you open a PR

All four must pass. CI runs the same commands on Node 20 and 22.

```bash
npm run typecheck    # tsc --noEmit
npm test             # vitest run
npm run audit:sample # must report 0 findings, exit 0
npm run audit:flawed # must report findings, exit 1
```

## The two things that make this project trustworthy

Both are enforced by tests. If a change trips them, the change is wrong, not the test.

**1. The coverage footer never overstates what was checked.**

Each audit ends by naming what it could *not* verify. The content footer reports from
`IMPLEMENTED_CONTENT_RULES` in `src/audit-content.ts` — not from RULES.json's `automatable` flag.
The flag says a rule *could* be automated; the list says it *is*. These drifted apart once, and the
footer spent several releases claiming four rules nothing actually checked.

**2. A bad input never audits clean.**

Every field in the content schema is optional, so an unrecognized shape would otherwise read as "no
content" and pass with zero findings — a green build gate on content that was never read. Unreadable
shapes are refused at load; drifted field names and empty courses report as `SCHEMA` findings. See
[`docs/CONTENT_SCHEMA.md`](docs/CONTENT_SCHEMA.md) § Shape validation.

## The two fixtures

They are a matched pair, and they only work together:

- [`examples/sample-course.json`](examples/sample-course.json) — must audit with **zero** findings.
- [`examples/flawed-course.json`](examples/flawed-course.json) — must **trip every implemented rule**.

The counter-example exists because "the sample is clean" is equally satisfied by an auditor that has
quietly stopped checking anything. **Do not repair the flawed course.** Its problems are the fixture.

## Adding or changing a rule

1. **Edit `docs/RULES.json` first.** Rules are data; logic is code. Include `id`, `category`,
   `title`, `scope`, `tier`, `sourceUrl`, `check`, and an `examples` block with `before` / `after` /
   `why`. The example doubles as a few-shot exemplar for generation prompts, so make it concrete.
2. **Cite a real source.** Every rule carries an evidence `tier`:
   `strong` / `moderate` / `contested` / `inference`. Never promote `contested` → `strong` without a
   source and a test plan. If you cannot find a source, the rule is an `inference` — label it so.
3. **If it is content-scoped and automatable, implement it** in `src/audit-content.ts`.
4. **Add its id to `IMPLEMENTED_CONTENT_RULES`** and **make `examples/flawed-course.json` trip it.**
   The footer may only claim a rule the fixture proves is reachable; `npm test` fails otherwise.
5. **Keep the sample clean.** If your rule makes `examples/sample-course.json` report findings,
   either the sample or the rule is wrong. Decide which, and say so in the PR.

Platform rules go in `src/audit-platform.ts` instead, and anything needing a rendered page, a
component, or human judgement belongs in that auditor's "needs human review" list.

## Rules we will not accept

LearnKit deliberately refuses claims that sound plausible but contradict the evidence:

- matching content to "learning styles" (visual/auditory/kinesthetic learners)
- dyslexia-specific fonts prescribed as a treatment
- a single high-contrast-only theme as the accessibility answer
- "faster feedback always wins"

See [`docs/SOURCE_OF_TRUTH.md`](docs/SOURCE_OF_TRUTH.md) §1–§2. A PR reintroducing one of these needs
to overturn the sources there, not just assert the opposite.

## Scope

Keep the kit subject-neutral. It was generalized from a production certification-course platform, and
examples must not carry product-specific material or name the platform it came from. Photosynthesis is
the house example for a reason: nobody's product ships it.

## Style

- **ESM only** (`"type": "module"`). Use `import.meta.url`; never `__dirname` or `require`.
- **No runtime dependencies, no network calls, no bundler.** The auditors read local files and
  print findings. `npm run build` is a plain `tsc` emit, nothing more. Keep it that way unless there
  is a strong reason and the maintainer agrees first.
- Match the surrounding code. Comments explain *why* a threshold or a refusal exists, not what the
  line does.

## Licensing

Contributions are accepted under the repository's split license: code (`src/`, `bin/`, `tests/`,
config) under [MIT](LICENSE); docs and examples (`docs/`, `README.md`, `examples/`) under
[CC BY 4.0](LICENSE-docs). By opening a PR you agree your contribution ships under whichever applies
to the files you touched. Cited external standards and research stay attributed to their authors and
are referenced, not relicensed.
