# LearnKit

**A neuroinclusive-coursework kit — evidence-based rules, schemas, and auditors for designing and generating instructional content for any subject.**

LearnKit turns learning science into something a coding agent (or a human) can *enforce*. It bundles a
research-backed instructional-design specification, a machine-readable rule set, and command-line
auditors that check your course content and delivery UI against those rules — so "make it pedagogically
sound and neuroinclusive" becomes a set of lint rules instead of an aspiration.

Built for people who generate coursework programmatically (LLM pipelines, course platforms, LMS
authoring tools) and want the output to be accessible to neurodivergent learners (ADHD, dyslexia,
autism, cognitive accessibility) and grounded in evidence rather than folklore.

## Medical and clinical disclaimer

> **LearnKit is an educational and instructional-design resource, not a medical or healthcare product
> or a medical device.** The information, designs, rules, techniques, examples, and software in this
> repository have **not** been medically or clinically evaluated, approved, cleared, or endorsed by the
> U.S. Food and Drug Administration (FDA) or any other medical, healthcare, or regulatory authority,
> and the project and its contributors make no claim that they have been. Nothing here is medical
> advice or is intended to diagnose, treat, cure, prevent, or mitigate any disease, disability, or
> health condition. References to ADHD, dyslexia, autism, neurodivergence, cognition, and accessibility
> describe educational and design considerations, not clinical recommendations. A
> `RESEARCH-SUPPORTED` or evidence-strength label means only that a rule is traceable under LearnKit's
> documented research method; it does not mean the rule or LearnKit itself has been clinically
> validated. Do not rely on LearnKit for healthcare decisions. Obtain appropriate professional,
> accessibility, legal, and user-testing review for your context.

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

## Research and standards behind LearnKit

LearnKit began with the **Leantime Neuroinclusive App Design Reference Guide** (12 Jul 2026), then
expanded through six research tracks: learning science; objectives/backward design/assessment;
retrieval/spacing/feedback; neuroinclusive and accessible instruction; motivation and gamification;
and authoring standards/agentic generation. The process produced 76 candidate claims, of which 31
survived a deliberately skeptical three-vote verification pass. A rejected claim was not necessarily
false; it often lacked sufficiently precise, independently confirmed support for the wording proposed.
See [`docs/RESEARCH.md`](docs/RESEARCH.md) for the method and
[`docs/SOURCE_OF_TRUTH.md`](docs/SOURCE_OF_TRUTH.md) §8 for provenance.

The complete repository-tracked source base is listed below. It mixes peer-reviewed studies and
meta-analyses, normative standards, institutional guidance, and clearly identifiable background
references; inclusion does not imply equal evidence strength, endorsement, or medical/clinical
validation. Each rule's actual evidence tier and source are recorded in
[`docs/RULES.json`](docs/RULES.json). This list mirrors the 36-item canonical bibliography plus the
eight additional rule-level sources recorded there as of July 2026.

### Canonical bibliography (36 sources)

1. [*How People Learn II*, Chapter 5 — National Academies (2018)](https://www.nationalacademies.org/read/24783/chapter/7)
2. [Dual Coding — The Learning Scientists](https://www.learningscientists.org/blog/2016/9/1-1)
3. [Mayer (2024), Cognitive Theory of Multimedia Learning review — ERIC index](https://eric.ed.gov/?q=mayer+multimedia+learning+2024)
4. [Cromley & Chen (2025), meta-analysis of multimedia principles](https://www.sciencedirect.com/science/article/pii/S1747938X25000673)
5. [Cognitive Load Theory — background reference](https://en.wikipedia.org/wiki/Cognitive_load)
6. [Barbieri et al. (2023), worked-example meta-analysis](https://link.springer.com/article/10.1007/s10648-023-09745-1)
7. [Schroeder et al. (2025), expertise-reversal meta-analysis](https://www.sciencedirect.com/science/article/pii/S0959475225000660)
8. [Bloom's Taxonomy — Top Hat](https://tophat.com/blog/blooms-taxonomy/)
9. [Structuring Learning (SOLO, Marzano) — University of Queensland ITALI](https://itali.uq.edu.au/teaching-guidance/principles-learning/guiding-theories-and-frameworks/structuring-learning)
10. [Backward Design — Yale Poorvu Center](https://poorvucenter.yale.edu/BackwardDesign)
11. [Rubric Best Practices — NC State DELTA](https://teaching-resources.delta.ncsu.edu/rubric_best-practices-examples-templates/)
12. [Formative and Summative Assessment — Carnegie Mellon Eberly Center](https://www.cmu.edu/teaching/assessment/basics/formative-summative.html)
13. [Distributed Practice meta-analysis (2025)](https://pmc.ncbi.nlm.nih.gov/articles/PMC12189222/)
14. [Retrieval Practice in Health Professions review (2025)](https://pmc.ncbi.nlm.nih.gov/articles/PMC12292765/)
15. [Dunlosky et al., high-utility learning strategies](https://www.aft.org/ae/fall2013/dunlosky)
16. [S2D2 / desirable-difficulties framework (2023)](https://link.springer.com/article/10.1007/s10648-023-09766-w)
17. [Feedback meta-analysis (2019), *Frontiers in Psychology*](https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2019.03087/full)
18. [Feedback-timing meta-analysis (2026), *Educational Psychology Review*](https://link.springer.com/article/10.1007/s10648-026-10117-8)
19. [Wery & Diliberto (2017), OpenDyslexic font](https://pmc.ncbi.nlm.nih.gov/articles/PMC5629233/)
20. [Dyslexie font and spacing study](https://pmc.ncbi.nlm.nih.gov/articles/PMC7188700/)
21. [What's New in WCAG 2.2 — W3C WAI](https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/)
22. [Making Content Usable for People with Cognitive and Learning Disabilities — W3C COGA (2021)](https://www.w3.org/TR/coga-usable/)
23. [Raymaker et al. (2019), AASPIRE Web Accessibility Guidelines](https://pmc.ncbi.nlm.nih.gov/articles/PMC6485264/)
24. [Self-Determination Theory (Ryan & Deci) — background reference](https://en.wikipedia.org/wiki/Self-determination_theory)
25. [Overjustification effect (Deci, Koestner & Ryan) — background reference](https://en.wikipedia.org/wiki/Overjustification_effect)
26. [Goal Setting in Higher Education, systematic review (2024)](https://www.frontiersin.org/journals/education/articles/10.3389/feduc.2024.1511605/full)
27. [Goal-Setting Theory (Locke & Latham) — background reference](https://en.wikipedia.org/wiki/Goal-setting_theory)
28. [ARIA Authoring Practices Guide — Tabs](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/)
29. [ARIA Authoring Practices Guide — Modal Dialog](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)
30. [Design Tokens Format Module 2025.10 — DTCG](https://www.designtokens.org/tr/2025.10/format/)
31. [ARCHED: AI-assisted instructional design (2025)](https://arxiv.org/abs/2503.08931)
32. [Reliable generative-AI scaffolding (2025), *Computers & Education*](https://arxiv.org/abs/2508.05929)
33. [AI-generated assessment and Bloom-level skew (2025)](https://arxiv.org/abs/2504.14232)
34. [cmi5 (xAPI Profile) — ADL / xAPI.com](https://xapi.com/cmi5/)
35. Pashler et al. (2008), learning-styles critique (recorded in the source document via source 2 above).
36. [CAST Universal Design for Learning Guidelines 3.0](https://udlguidelines.cast.org/)

### Additional rule-level sources (8 sources)

1. [Using Bloom's Taxonomy — University of Arkansas](https://tips.uark.edu/using-blooms-taxonomy/)
2. [Formative and Summative Assessments — Yale Poorvu Center](https://poorvucenter.yale.edu/Formative-Summative-Assessments)
3. [Gamification — background reference](https://en.wikipedia.org/wiki/Gamification)
4. [`prefers-reduced-motion` — MDN Web Docs](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion)
5. [Dyslexia Style Guide (2023) — British Dyslexia Association](https://cdn.bdadyslexia.org.uk/documents/Advice/style-guide/BDA-Style-Guide-2023.pdf)
6. [WCAG 2.2 Understanding Success Criterion 1.4.1: Use of Color — W3C WAI](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html)
7. [Personalization Semantics — W3C WAI](https://www.w3.org/WAI/personalization/)
8. [ARIA Authoring Practices Guide — W3C WAI](https://www.w3.org/WAI/ARIA/apg/)

## License

- **Code** (`src/`, `bin/`, `tests/`, config): [MIT](LICENSE).
- **Docs & research** (`docs/`, `README.md`, `examples/`): [CC BY 4.0](LICENSE-docs).

Cited external standards and research belong to their respective authors and are referenced, not
relicensed.

## Provenance

LearnKit was extracted from a working NVIDIA certification-course platform and generalized. It began as
an audit of the *Leantime Neuroinclusive App Design Reference Guide* and was expanded via a multi-agent
research pass. See [`docs/RESEARCH.md`](docs/RESEARCH.md).
