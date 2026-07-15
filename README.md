# LearnKit

**A neuroinclusive-coursework kit — evidence-based rules, schemas, and auditors for designing and generating instructional content for any subject.**

LearnKit turns learning science into something a coding agent (or a human) can *enforce*. It bundles a
research-backed instructional-design specification, a machine-readable rule set, and command-line
auditors that check your course content and delivery UI against those rules — so "make it pedagogically
sound and neuroinclusive" becomes a set of lint rules instead of an aspiration.

Built for people who generate coursework programmatically (LLM pipelines, course platforms, LMS
authoring tools) and want the output to be accessible to neurodivergent learners (ADHD, dyslexia,
autism, cognitive accessibility) and grounded in evidence rather than folklore.

- **Fork it. Adapt it. Use it commercially.** Code is MIT; docs/research are CC BY 4.0.
- **No lock-in.** Plain JSON in, plain findings out. Works with any content pipeline that can emit the
  small [content schema](docs/CONTENT_SCHEMA.md).

## What's inside

| Path | What it is |
|---|---|
| [`docs/SOURCE_OF_TRUTH.md`](docs/SOURCE_OF_TRUTH.md) | The spec — evidence-labeling protocol, prohibited outputs, the backward-design pipeline, and ~57 encodable rules across objectives, cognitive load, multimedia, spacing/retrieval, feedback/assessment, motivation, accessibility, and authoring standards. |
| [`docs/RULES.json`](docs/RULES.json) | Every rule as data: `id`, `scope`, evidence `tier`, `sourceUrl`, an automatable `check`, and a `before`/`after`/`why` example you can paste into a generation prompt as a few-shot exemplar. |
| [`docs/RESEARCH.md`](docs/RESEARCH.md) | How the rules were produced — fan-out research + 3-vote adversarial verification (76 claims → 31 survived) — and how to extend them. |
| [`docs/CONTENT_SCHEMA.md`](docs/CONTENT_SCHEMA.md) | The JSON your content pipeline should emit for the auditor. |
| [`src/audit-content.ts`](src/audit-content.ts) | Content auditor — checks lessons, objectives, and questions. |
| [`src/audit-platform.ts`](src/audit-platform.ts) | Delivery-layer auditor — checks CSS/design-token accessibility. |
| [`examples/sample-course.json`](examples/sample-course.json) | A clean "Photosynthesis Basics" course that audits with zero findings — your template. |

## Quickstart

```bash
git clone <your-fork> learnkit && cd learnkit
npm install

# Audit the bundled sample course (should be clean):
npm run audit:sample

# Audit your own content (a bundle or a single course JSON):
npx tsx src/audit-content.ts path/to/your-course.json

# Audit a web delivery layer's CSS/tokens for neuroinclusion:
npx tsx src/audit-platform.ts --dir path/to/your/styles

# List the rule set:
npm run rules

# Run the test suite:
npm test
```

Every audit ends with a **coverage footer** listing the rules it could *not* check automatically
(platform/pipeline/human-review), so it never overstates what passed.

## As a build gate

Fail your content build when any finding is an error:

```ts
import { auditCourse, loadCourses } from "learnkit"; // or "./src/audit-content"

const courses = loadCourses("build/course-bundle.json");
let errors = 0;
for (const [id, course] of Object.entries(courses)) {
  for (const f of auditCourse(id, course)) {
    if (f.severity === "error") { errors++; console.error(`[${id}] ${f.ruleId}: ${f.message}`); }
  }
}
if (errors) process.exit(1); // block the build until content is clean
```

This is how the NVIDIA certification-course platform that seeded LearnKit gated its content — e.g.
"every quiz item must carry a `cognitiveLevel`" and "prefer per-choice rationales over a bare answer key."

## The evidence discipline

LearnKit's core idea is **label everything and refuse the myths.** Each rule carries an evidence tier
(`strong` / `moderate` / `contested` / `inference`) and a source. And it hard-refuses patterns that
sound plausible but contradict the evidence — e.g. matching content to "learning styles," prescribing
dyslexia-specific fonts as a treatment, a single high-contrast-only theme, or "faster feedback always
wins." See [`docs/SOURCE_OF_TRUTH.md`](docs/SOURCE_OF_TRUTH.md) §1–§2.

## License

- **Code** (`src/`, `bin/`, `tests/`, config): [MIT](LICENSE).
- **Docs & research** (`docs/`, `README.md`, `examples/`): [CC BY 4.0](LICENSE-docs).

Cited external standards and research belong to their respective authors and are referenced, not
relicensed.

## Provenance

LearnKit was extracted from a working NVIDIA certification-course platform and generalized. It began as
an audit of the *Leantime Neuroinclusive App Design Reference Guide* and was expanded via a multi-agent
research pass. See [`docs/RESEARCH.md`](docs/RESEARCH.md).
