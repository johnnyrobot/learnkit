# LearnKit — Instructional Design Source of Truth

**An agent-facing specification for designing and generating neuroinclusive coursework and instructional content for _any_ subject.**

This document is the canonical reference a coding agent MUST consult before producing instructional
material — a full course, a single lesson, an explainer, a microlearning card, a quiz, a rubric, or a
UI that delivers any of these. It fuses two inputs:

1. **The Leantime Neuroinclusive App Design Reference Guide** (12 Jul 2026) — the delivery-surface layer:
   neuroinclusive UX patterns, personalization, design-system tokens, accessibility, and the
   evidence-labeling discipline.
2. **A fan-out research audit** (Jul 2026, 6 angles → 76 candidate claims → 31 survived 3-vote
   adversarial verification) — the learning-science spine: objectives, cognitive load, multimedia,
   spacing/retrieval, feedback/assessment, motivation, and machine-checkable authoring standards.

> **How an agent uses this file.** Read §1 (labeling), §2 (prohibited outputs), and §3 (pipeline)
> **every time**. Then apply the rule sets in §4 to the artifact you are producing. Every rule with a
> `Check:` clause is a pre-commit validator — encode it as an automated gate. Rules marked `INFERENCE`
> or `contested` require a human/second-model checkpoint and MUST NOT be auto-approved by a single LLM
> judge (see §3, TEC-8).

### Enforcement tooling (this repo)

The rules are machine-readable and enforced, not just documented:

| Artifact | Purpose |
|---|---|
| `docs/RULES.json` | All 57 rules + 7 prohibited patterns as data — each with `tier`, `scope`, `automatable`, `sourceUrl`, and a `before`/`after`/`why` example (usable as few-shot exemplars in generation prompts). |
| `src/audit-content.ts` | Content audit — every content-scoped auto-checkable rule vs a course JSON file. Run: `learnkit audit <file.json> [--json]` (or `npm run audit -- <file.json>`). |
| `src/audit-platform.ts` | Delivery-layer audit — DTCG tokens (TEC-5), ≥3 palettes (NEU-5), reduced-motion (NEU-9), reader/focus controls. Run: `learnkit audit-platform --dir <styles-dir>`. |
| `docs/CONTENT_SCHEMA.md` | The JSON shape the content audit expects; adapt your pipeline to emit it. |
| `examples/sample-course.json` | A gold-standard course that audits clean — a template and a test fixture. |
| `tests/audit.test.ts` | CI guard — the sample course must stay free of error-severity findings. |

Coverage is honest: each audit prints which rules it could **not** check (platform/pipeline/human-review) so nothing is silently claimed as passing.

**Using it as a build gate.** Call `auditCourse()` from your own build/export step and fail the build
when any finding has `severity === "error"` (see the README "As a build gate" snippet). That is how the
original course platform that seeded this toolkit enforced, e.g., "every question must carry a
`cognitiveLevel`" before content could ship.

---

## 1. Evidence-labeling protocol (MANDATORY)

Instructional claims are cheap to assert and expensive to verify. This scheme — inherited from the
Leantime guide and extended — is the backbone of the spec. **A feature or claim being generable does
not prove it is effective, accessible, or true.** Label everything.

| Label | Meaning | Agent rule |
|---|---|---|
| `IMPLEMENTED` | Behavior exists and **passes an automated check** in the produced artifact | Requires a passing validator, not a claim (e.g. a tab widget that passes TEC-1) |
| `RESEARCH-SUPPORTED` | Traceable to a surviving source; carries a strength sub-tier | Must cite a source URL + strength |
| `INFERENCE` | Reasoned extension of sources, not directly stated | Must name the source(s) it extends and say "not a single-source claim" |
| `MAKER-CLAIM` | Asserted by author/agent with no external source | Allowed **only** for product/brand/scope decisions — **never** for pedagogical or accessibility claims |

**Strength sub-tiers for `RESEARCH-SUPPORTED`:**
- `[strong]` — RCT, meta-analysis, or normative standards body (W3C, DTCG, 1EdTech/ADL).
- `[moderate]` — single study, mixed literature, or non-normative standards note.
- `[contested]` — genuine disagreement in the literature; adopt only with a stated rationale and a test plan (§6).

**Mandatory generation rules:**
1. **Every generated pedagogical/accessibility artifact carries a provenance stamp**:
   `{rule_id, tier, strength, source_url, objective_id}`. Un-stamped content is rejected at the §3 gate.
2. **You may not relabel a myth as `MAKER-CLAIM` to smuggle it in.** The §2 prohibited outputs are banned
   under *any* label.
3. **Precedence:** strong > moderate; evidence > inference; nothing overrides a prohibited output. On
   conflict, cite both sources and take the higher tier.
4. Content-level enforcement = the provenance stamp. Process-level enforcement = the §3 checkpoints.

---

## 2. Prohibited outputs (evidence-contradicted — never emit)

These contradict strong evidence. An agent MUST refuse to generate them and cite the contradicting rule.

| Prohibited pattern | Why | Contradicts |
|---|---|---|
| "Identify your learning style, then get format-matched content" | Matching instruction to a self-reported visual/auditory/kinesthetic style does **not** improve outcomes (Pashler et al. 2008). | MM-2 |
| Prescribing OpenDyslexic / Dyslexie fonts as a reading treatment | No RCT support; OpenDyslexic scored *worse* on fluency (Wery & Diliberto 2017). Matched letter/word spacing on a standard sans-serif reproduces any benefit (PMC7188700). | NEU-1 |
| A single hard-coded high-contrast-only color scheme | Maximal contrast can be painful/unreadable for autistic users; offer ≥3 palettes instead (AASPIRE). | NEU-5 |
| "Faster feedback always wins" as a design driver | Feedback timing is **not** a reliable main effect; information quality is what moves outcomes. | FBK-2 |
| Justifying engagement mechanics with vague "dopamine" claims | Gamification evidence is mixed and context-dependent; extrinsic rewards can crowd out intrinsic motivation. | MOT-5, §4f |
| Color/emoji as the *only* status encoding | Fails cognitive + sensory accessibility; always pair with text/icon. | NEU-8 |
| A single LLM-as-judge as the sole quality gate | Documented systematic judge bias in AI-generated instructional content. | TEC-8 |

---

## 3. The generation pipeline (backward design + verification gates)

Design **backward** (Wiggins & McTighe; constructive alignment, Biggs), then generate, then verify.
Never emit final instructional text or assessment items in a single unchecked step.

```
STAGE 0  SCOPE        Subject, audience, prior-knowledge level, delivery context (self-paced?), constraints
STAGE 1  OUTCOMES     Write measurable objectives (§4a). Identify desired results FIRST.
STAGE 2  EVIDENCE     Design assessments/rubrics that measure each objective (§4e) BEFORE content.
STAGE 3  EXPERIENCE   Generate content, sequencing, practice & feedback (§4b–d, f–h).
STAGE 4  GATE 1       Evaluator agent checks objective-alignment of every proposed artifact (ARCHED pattern).
STAGE 5  GATE 2       Provenance-stamp check + accessibility/authoring validators (§4g–h). Multi-model
                      OR non-LLM check — never a single LLM judge (TEC-8).
STAGE 6  COMMIT       Only stamped, aligned, validated artifacts ship.
```

- **TEC-7 `[moderate]`** — Pipeline MUST have **≥2 checkpoints** before "ready": (1) after options are
  proposed, (2) after alignment is checked. LLM proposes; human/evaluator confirms. *Src: ARCHED 2025 (arXiv 2503.08931).*
- **TEC-8 `[moderate]`** — Quality gate MUST NOT be a single LLM judge. Require a multi-model panel **or**
  ≥1 non-LLM check (human review, retrieval-based fact verification against a curriculum KB, or automated
  rubric scoring). *Src: arXiv 2508.05929 (Computers & Education, 2025).*
- Known AI-authoring failure modes to gate against: hallucinated facts in scaffolds; assessment items
  skewing to **lower-order** Bloom levels; silent accessibility regressions after content swaps.

---

## 4. Encodable rule sets

Each rule is written to be checkable. `Check:` = the automated validator. Cross-references in `()`.

### (a) Learning objectives & alignment

- **OBJ-1 `[strong]`** Every objective is labeled with a **two-dimensional Bloom's cell**: one cognitive
  process (Remember | Understand | Apply | Analyze | Evaluate | Create) **and** one knowledge type
  (Factual | Conceptual | Procedural | Metacognitive), e.g. `Apply × Procedural`.
  `Check:` reject any objective missing either axis. *Src: Anderson & Krathwohl.*
- **OBJ-2 `[strong]`** Prefer a **single measurable action verb** per objective. Two verbs
  ("define and apply") split into two objectives so mastery is unambiguous.
  `Check:` flag objectives with >1 assessable verb. *Src: revised Bloom's authoring guidance.*
- **OBJ-3 `[moderate]`** Do **not** enforce Bloom's ordering as a prerequisite chain — verb-to-level
  mappings are inconsistent across institutions and higher-order work can precede lower-order recall.
  Non-sequential ordering allowed **with** a written `sequencing_rationale`.
  `Check:` if a lower-level objective is chained after a higher one, require the rationale field. *Src: UQ ITALI.*
- **OBJ-4 `[moderate, contested]`** Frame objectives in **learning-goal / mastery** language
  ("you will be able to explain X"), not performance-goal language ("score 80%").
  `Check:` flag objectives containing score/percentage targets. *Src: Frontiers in Education 2024.*
- **OBJ-5 `[moderate]`** For novice-facing or high-complexity modules use mastery-oriented goals
  ("understand the key concepts"); reserve specific challenging performance targets for consolidation.
  `Check:` first module of a track sets no numeric first-attempt accuracy target. *Src: Locke & Latham.*
- **OBJ-6 `[moderate]`** When motivation/self-regulation is a known barrier (self-paced, professional
  upskilling), add ≥1 **self-system** objective ("identify personal relevance") and ≥1 **metacognitive**
  objective ("monitor comprehension with a checklist").
  `Check:` self-paced flag ⇒ both objective types present. *Src: Marzano via UQ ITALI.*
- **OBJ-7 `[INFERENCE]`** Backward-design alignment: every assessment item references the ID of the
  objective it measures; every objective has ≥1 aligned formative check and appears in a summative task.
  *(Extends CMU/Yale + ARCHED alignment; not a single-source claim.)*

### (b) Content structure & cognitive load

- **STR-1 `[strong]`** **Segmenting:** divide complex topics into learner-controlled segments with
  explicit continue-gates at natural boundaries.
  `Check:` no continuous unit crosses a natural boundary without a user-paced gate. *Src: Mayer (multimedia), 2024.*
- **STR-2 `[strong]`** **Pre-training:** provide a vocabulary/concept primer before any lesson that
  introduces ≥5 new technical terms.
  `Check:` count new terms per lesson; ≥5 ⇒ require a preceding pre-training block. *Src: Mayer 2024.*
- **STR-3 `[strong]`** Distinguish **intrinsic** load (element interactivity, inherent to the subject —
  manage by sequencing simple→complex) from **extraneous** load (caused by presentation — minimize it).
  `Check:` presentation-caused load (split attention, redundant text) is flagged independently of topic difficulty. *Src: Sweller / CLT.*
- **STR-4 `[strong]`** **Worked-example effect:** for novices learning procedures, lead with fully
  worked examples before free problem-solving; fade to completion problems, then independent practice
  (expertise-reversal: withdraw support as competence grows).
  `Check:` procedural modules present ≥1 worked example before the first unsupported problem. *Src: Barbieri et al. 2023 meta-analysis (g≈0.48); Schroeder et al. 2025.*
- **STR-5 `[strong]`** Persistent progress indicators + "resume where I left off" so working across
  segments does not rely on memory. (Ties NEU-6, COGA.) *Src: How People Learn II, 2018.*

### (c) Multimedia & representation

- **MM-1 `[strong]`** **Dual coding:** pair every abstract concept/process with a corresponding visual
  (diagram, flowchart, annotated image), not decoration.
  `Check:` each concept node has ≥1 linked, relevant visual. *Src: Learning Scientists; Mayer.*
- **MM-2 `[strong]`** **No learning-styles matching.** All learners get multimodal presentation
  regardless of stated preference. `Check:` reject any UI branch keyed on self-reported style. *Src: Pashler et al. 2008.* (See §2.)
- **MM-3 `[strong]`** **Coherence:** exclude extraneous material (decorative graphics, background audio,
  tangential asides). **Signaling:** add cues (headings, arrows, bold) that expose structure.
  `Check:` flag decorative-only media on instructional pages; require heading/signal structure. *Src: Mayer 2024.*
- **MM-4 `[strong]`** **Temporal & spatial contiguity:** present captions/labels/narration *with* the
  graphic they describe and place them *next to* it — never text-first-then-image-seconds-later, never
  a legend far from its figure.
  `Check:` in timed media, caption timestamp ≈ graphic timestamp; labels adjacent to referents. *Src: Mayer 2024.*
- **MM-5 `[strong]`** **Modality & redundancy:** for graphics + explanation, prefer graphics + narration
  over graphics + on-screen text; do **not** add narration that reads on-screen text verbatim.
  `Check:` no simultaneous identical narration + full on-screen text over a graphic. *Src: Mayer, modality/redundancy principles.*

### (d) Practice, spacing & retrieval

- **SPC-1 `[strong]`** **Spacing:** each concept is revisited **≥1× after a gap of ≥1 day**. Do not mass
  all practice for a concept in one block; distribute across later sessions.
  `Check:` each concept has ≥2 practice touchpoints in different sessions ≥1 calendar day apart. *Src: How People Learn II, 2018; distributed-practice meta-analysis 2025.*
- **SPC-2 `[strong]`** **Retrieval practice / testing effect:** include low-stakes retrieval (recall
  questions, application tasks) rather than re-reading; retrieval **follows** instruction.
  `Check:` no retrieval item references a concept not yet taught. *Src: Dunlosky et al. (high-utility); health-professions retrieval review 2025 (g≈0.50).*
- **SPC-3 `[strong]`** **Interleaving:** mix related problem types within practice sets rather than
  blocking one type, once foundations are in place.
  `Check:` practice sets past the intro phase are not single-type blocks. *Src: Dunlosky et al.; Rohrer.*
- **SPC-4 `[moderate]`** **Transfer-appropriate retrieval:** match practice format to the criterion
  test's cognitive demand. High-volume isolated-fact flashcards underperform on applied/certification exams.
  `Check:` if the summative requires applied reasoning, practice includes applied (not recall-only) items. *Src: retrieval review 2025.*
- **SPC-5 `[moderate]`** In spaced-repetition systems, require **multiple successful retrievals** (≥2),
  not one, before retiring an item. `Check:` card-retire threshold ≥2. *Src: retrieval review 2025.*
- **SPC-6 `[moderate]`** Learners with **low prior knowledge** get explicit instruction *before*
  retrieval; self-explanation prompts can impede weak-prior-knowledge learners.
  `Check:` prerequisite-gap flag ⇒ instruction precedes first retrieval. *Src: How People Learn II; retrieval review 2025.*
- **SPC-7 `[strong]`** **Surface desirable difficulty.** Learners misjudge effortful strategies as
  ineffective (effort↔learning miscalibration, r≈−0.36) and revert to massed re-reading. Tell learners
  *why* spacing/retrieval feels hard and works; show delayed-benefit evidence.
  `Check:` spaced/retrieval activities carry an explanatory rationale to the learner. *Src: S2D2 framework, 2023.*

### (e) Feedback & assessment

- **ASM-1 `[strong]`** Every module has ≥1 **low/no-stakes formative** check *during* instruction,
  before the summative. Label each assessment `FORMATIVE` or `SUMMATIVE` with its stake level.
  `Check:` each module has ≥1 FORMATIVE item positioned before any SUMMATIVE item. *Src: CMU Eberly; Yale Poorvu.*
- **ASM-2 `[moderate]`** Formative feedback is **(1) actionable** (tied to specific criteria, not a bare
  score), **(2) revisable** (learner can act before the summative), **(3) metacognitive** (includes a
  self-assessment/reflection prompt).
  `Check:` formative items expose criterion links + a revision opportunity + a reflection prompt. *Src: Yale Poorvu.*
- **ASM-3 `[moderate]`** Summative items prioritize **application** (Bloom's Apply and above) over
  recall-only; guard against AI's documented skew to lower-order items.
  `Check:` summative set is not majority Remember-level. *Src: Yale Poorvu; arXiv 2504.14232.*
- **FBK-1 `[strong]`** Feedback is **informational** (what was correct and why; what mastery looks like),
  not **controlling** (bare scores, ranking, point-loss framing). Elaborated/corrective feedback
  outperforms bare reinforcement (d≈0.99 vs 0.24).
  `Check:` feedback text carries corrective/explanatory content, not a score alone. *Src: Vallerand & Reid (SDT); feedback meta-analysis 2019 (d≈0.48 overall).*
- **FBK-2 `[strong]`** Do **not** optimize feedback for *speed*. Invest in **information quality**
  (specificity, elaboration, corrective content) matched to level and domain; delayed feedback is
  acceptable/preferable when it lets learners consolidate first.
  `Check:` feedback objects carry specificity/elaboration fields; no rule enforces sub-second delivery. *Src: feedback-timing meta-analysis 2026.*
- **RUB-1 `[strong]`** Rubric descriptors MUST: (1) ban generic adjectives ("good/excellent/poor") in
  favor of observable qualities ("credible, peer-reviewed sources"); (2) describe **impact** ("errors do
  not distract from readability") not **counts** ("three misspellings"); (3) be syntactically **parallel**
  across adjacent levels of a criterion; (4) keep wording consistent; (5) fit on **one page**.
  `Check:` lint against a banned-adjective list, count-based-criterion regex, cross-level parallelism, page budget. *Src: NC State DELTA.*
- **RUB-2 `[moderate]`** Pick rubric type by task: **analytic** (per-criterion) for multi-skill/uneven
  work; **holistic** for quick or subjective/creative judgments; **single-point** for formative,
  individualized feedback. `Check:` rubric type recorded and matches task profile. *Src: NC State DELTA.*

### (f) Motivation & engagement

- **MOT-1 `[strong]`** Design for the three SDT needs — **autonomy** (meaningful choices, learner
  control), **competence** (informational feedback, achievable challenge), **relatedness** (connection).
  Autonomous motivation beats controlled motivation on persistence and deep learning. *Src: Ryan & Deci; SDT.*
- **MOT-2 `[strong]`** **Overjustification guardrail:** tangible, expected, task-contingent rewards on
  already-interesting tasks undermine intrinsic motivation (Deci, Koestner & Ryan 2001, 128 studies).
  Prefer competence-informational feedback; if rewards are used, make them performance-contingent and
  informational, never bare task-contingent contingencies.
  `Check:` no expected task-contingent tangible reward gates a high-interest activity. *Src: overjustification literature.*
- **MOT-3 `[moderate]`** **Progress over comparison:** show a learner's own progress over time, not
  social-comparison leaderboards (which demotivate those at the bottom).
  `Check:` no default public ranking; individual progress view present. *Src: gamification reviews.*
- **MOT-4 `[moderate]`** Goal-setting interventions work best **paired with planning support and
  self-regulated-learning training** — prompts alone show minimal benefit; single-session goal-setting
  rarely produces lasting change. `Check:` goal-setting features ship with a planning/SRL scaffold. *Src: Frontiers in Education 2024.*
- **MOT-5 `[INFERENCE]`** Gamification, if used, expresses rewards as **competence-informational**
  (progress toward mastery), never as controlling external contingencies. *(Extends SDT; no gamification-specific surviving source — treat effects as context-dependent, not guaranteed.)*
- **MOT-6 `[moderate]`** Celebration/animation is **optional, reduced-motion-aware, quiet-mode capable**,
  tied to meaningful accomplishment; no forced streaks or loss framing. `Check:` celebration honors
  `prefers-reduced-motion` and a user toggle. *Src: Leantime guide; SDT.*

### (g) Neuroinclusive & accessible delivery

*(This layer carries the Leantime guide's core patterns forward, corrected and operationalized.)*

- **NEU-1 `[strong]`** Do **not** prescribe dyslexia-specific fonts. Use well-spaced standard sans-serif
  (Arial, Verdana, Atkinson Hyperlegible as an *option*). Present any font as a preference, not a treatment.
  `Check:` font allowlist excludes dyslexia-"treatment" faces as defaults. *Src: Wery & Diliberto 2017; PMC7188700.*
- **NEU-2 `[strong]`** Readability defaults: sans-serif; adequate size and spacing; left-aligned (no
  justification); short, direct sentences; meaningful headings; restrained emphasis; no walls of text,
  long italic passages, or ALL CAPS. Let users independently adjust size, line height, letter spacing,
  and content width. `Check:` typography controls expose all four axes; no justified body text. *Src: British Dyslexia Association Style Guide 2023.*
- **NEU-3 `[strong]`** Credential/auth: never block password managers, never require recall/retype,
  allow copy-paste + autocomplete, no cognitive-function-test CAPTCHA without an alternative (WCAG 2.2 SC 3.3.8).
  `Check:` credential inputs allow paste + carry autocomplete attributes. *Src: W3C WAI WCAG 2.2.*
- **NEU-4 `[strong]`** In multi-step forms/registration, auto-populate or make selectable any info the
  learner already entered in the same process (WCAG 2.2 SC 3.3.7). `Check:` no field re-requests
  earlier-supplied data. *Src: WCAG 2.2.*
- **NEU-5 `[moderate]`** Offer **≥3 palettes** — high-contrast, low-contrast neutral (off-white bg /
  medium-gray text), and dark — via a switcher reachable from every page. Do not hard-code a single
  high-contrast scheme. WCAG contrast minimums still apply *within* each palette.
  `Check:` ≥3 palette token sets; switcher present on every page. *Src: AASPIRE (PMC6485264).*
- **NEU-6 `[moderate]`** Breadcrumbs at every depth; bidirectional font-size control (reduce **and**
  enlarge); navigation, progress, and help elements in identical positions across pages.
  `Check:` breadcrumb at all depths; font control supports decrease; nav coordinates stable page-to-page. *Src: AASPIRE.*
- **NEU-7 `[moderate]`** All auto-playing content (video, carousel, animation) has a visible pause/stop
  reachable within **one interaction**; provide "resume where I left off" that persists position.
  `Check:` every auto-content element has a 1-step stop; resume state persisted. *Src: W3C COGA 2021 (ADHD).*
- **NEU-8 `[strong]`** Never encode status by color or emoji alone — pair with a text label and/or icon;
  expose the semantic text to assistive technology. `Check:` every status token has a text equivalent. *Src: WCAG 1.4.1; Leantime priority pattern.*
- **NEU-9 `[strong]`** Honor `prefers-reduced-motion` (collapse animation/transition), `forced-colors`,
  and `prefers-contrast`. `Check:` a reduced-motion path exists for every animation. *Src: MDN; Leantime accessibility.css.*
- **NEU-10 `[moderate]`** Autistic-learner language: literal, specific, precise; avoid idioms,
  metaphors, and ambiguity; make state transitions explicit (saved, scheduled, moved, completed,
  blocked, failed); offer "not applicable / prefer not to say" on required inputs.
  `Check:` copy linter flags idioms/ambiguous directional phrases in instructional text. *Src: AASPIRE; COGA.*
- **NEU-11 `[moderate]`** Audit each build against the **W3C COGA objectives** as a checklist: help users
  understand what things are and how to use them; don't rely on memory; help users focus; support
  adaptation/personalization; provide stop controls; keep navigation consistent.
  `Check:` COGA checklist attached to each course build. *Src: W3C COGA 2021.*
- **NEU-12 `[strong]`** Personalization = pacing, palette, font metrics, density, motion, and difficulty
  — **not** modality-to-style assignment (see MM-2). Persist choices; provide Reset; keep every choice
  editable after onboarding. `Check:` preference values validated against an allowlist; never inject
  arbitrary CSS from a preference. *Src: Leantime Theme engine; W3C Personalization.*

### (h) Technical / authoring standards & interoperability

- **TEC-1 `[strong]`** Tab widgets: `role="tablist"` container; each `role="tab"` with `aria-selected`
  and `aria-controls`→panel id; each `role="tabpanel"` with `aria-labelledby`→tab id.
  `Check:` all three roles + paired ids. *Src: ARIA APG Tabs.*
- **TEC-2 `[strong]`** Tab keys: Arrow Left/Right with wrap; Tab moves in/out; Space/Enter activates;
  Up/Down only if `aria-orientation="vertical"`. `Check:` handlers present; no Up/Down without vertical orientation. *Src: ARIA APG.*
- **TEC-3 `[strong]`** Modal dialogs: `role="dialog"` + `aria-modal="true"`; a label; Tab/Shift+Tab focus
  trap; Escape to close; focus restored to the invoker; background `inert`.
  `Check:` validate attributes + focus trap + inert. *Src: ARIA APG Modal Dialog.*
- **TEC-4 `[strong]`** Interactive widgets built on legacy/custom controls must implement the **complete**
  WAI-ARIA pattern (roles, focus management, active descendant, keyboard) — `role="combobox"` alone is
  not a combobox. Prefer native HTML first. `Check:` custom widget passes its APG pattern's full checklist. *Src: WAI-ARIA APG.*
- **TEC-5 `[strong]`** Design tokens: single source of truth in **DTCG** format. Files are valid JSON,
  `*.tokens.json`; an object is a token **iff it has `$value`**, else a group; names must not start with
  `$` or contain `{`, `}`, `.`; every token has an explicit or inherited `$type`; circular
  `{token.reference}` chains are detected and rejected. Generate CSS variables, typed constants, and
  design-tool exports *from* the token package; add drift tests.
  `Check:` extension, `$value` rule, name regex, `$type` presence, cycle detection. *Src: DTCG Format Module 2025.10.*
- **TEC-6 `[moderate]`** New LMS-interoperable packages implement **cmi5** (an xAPI Profile), not
  SCORM 1.2/2004, using cmi5 controlled-vocabulary verbs for completion/pass-fail/score; verify the
  target LMS consumes cmi5 first. `Check:` package protocol = cmi5; verbs from cmi5 vocabulary. *Src: ADL / xAPI cmi5.*
- **TEC-7 / TEC-8** — pipeline gates, see §3.

---

## 5. Interaction-state & delivery requirements (carried from the Leantime guide)

Every interactive element in delivered instructional content must satisfy these states. This table is
reproduced from the source guide because it remains correct and directly checkable.

| State | Minimum visible behavior | Accessibility requirement |
|---|---|---|
| Default | Clear label, affordance, current value | Programmatic name and role |
| Hover | Optional preview only | No hover-only information or action |
| Focus | Persistent 2px+ high-contrast indicator | Logical order; not obscured; keyboard operable |
| Active/pressed | Immediate state change | `aria-pressed/checked/selected` as appropriate |
| Loading | Local progress; context preserved | Announce politely; do not steal focus |
| Success | What changed + what's next | Text, not color alone; motion optional |
| Error | Plain-language cause + recovery path | Associate error with field; preserve input |
| Empty | Meaningful explanation + first action | Never a blank region |
| Disabled | Reason when non-obvious | Do not trap focus |

**Information architecture (goals → next action).** Structure any course as: Goal (what to change) →
Milestone (next meaningful stage) → Project/context (where it belongs) → Task/lesson (what to complete)
→ Subtask/step (smallest start) → Focus session (what I'm doing now). Support both "Why am I doing this?"
and "What do I do next?" without mixing every level on one screen.

**Reusable onboarding sequence.** Orient (state the goal in one sentence, show first useful outcome) →
choose comfort (preview theme/typography/spacing/motion; offer Skip & Reset) → choose context (ask only
what changes prioritization) → create one authentic object (not disposable sample data) → guide one
complete loop → reflect → fade (stop interrupting; keep help replayable and contextual).

---

## 6. Contested areas & where to test with real learners

Adopt these with a stated rationale and a measurement plan; do not launder them into `[strong]`.

1. **Spacing magnitude is not universal** (meta-analytic heterogeneity is high). Instrument delayed-retention
   checks per concept; don't promise a fixed effect size. (SPC-1/2)
2. **Spacing at young ages / very short courses** shows the weakest effects; verify empirically before relying on it there. (SPC)
3. **Feedback timing** has no reliable main effect; the *right* timing is domain- and level-specific. A/B immediate vs delayed in your context. (FBK-2)
4. **Learning-goal vs performance-goal framing** is mixed in higher ed; we adopt learning-goal framing for lower downside, not proven superiority. (OBJ-4)
5. **"Do your best" vs specific goals** flips with complexity/prior knowledge; pilot both at the module's real difficulty. (OBJ-5)
6. **Bloom's hierarchy** verb mappings are institution-inconsistent; treat ordering as non-binding and validate non-sequential designs. (OBJ-3)
7. **AASPIRE findings** come from an autistic-adult sample; offering options (not defaults) is the safe hedge for other neurotypes and children. (NEU-5/6)
8. **LLM-as-judge bias** magnitude per domain is unknown; the multi-model/human hedge is prudential, not calibrated. (TEC-8)
9. **cmi5 vs SCORM** is a tooling bet; confirm LMS support before committing. (TEC-6)
10. **Self-system/metacognitive objectives** improving motivation-barrier courses is plausible but framework-descriptive, not RCT-backed. (OBJ-6)

---

## 7. Source bibliography (deduplicated, verification-surviving)

Standards/normative and peer-reviewed sources are preferred. Links checked Jul 2026.

1. How People Learn II — National Academies (2018), Ch. 5 — https://www.nationalacademies.org/read/24783/chapter/7
2. The Learning Scientists — Dual Coding — https://www.learningscientists.org/blog/2016/9/1-1
3. Mayer (2024), Cognitive Theory of Multimedia Learning review, *Educational Psychology Review* — https://eric.ed.gov/?q=mayer+multimedia+learning+2024
4. Cromley & Chen (2025), meta-analysis of multimedia principles — https://www.sciencedirect.com/science/article/pii/S1747938X25000673
5. Cognitive Load Theory (Sweller; Paas & Van Merriënboer) — https://en.wikipedia.org/wiki/Cognitive_load
6. Barbieri et al. (2023), worked-example meta-analysis (math) — https://link.springer.com/article/10.1007/s10648-023-09745-1
7. Schroeder et al. (2025), expertise-reversal meta-analysis — https://www.sciencedirect.com/science/article/pii/S0959475225000660
8. Bloom's Taxonomy — Top Hat — https://tophat.com/blog/blooms-taxonomy/
9. Structuring Learning (SOLO, Marzano) — UQ ITALI — https://itali.uq.edu.au/teaching-guidance/principles-learning/guiding-theories-and-frameworks/structuring-learning
10. Backward Design — Yale Poorvu Center — https://poorvucenter.yale.edu/BackwardDesign
11. Rubric Best Practices — NC State DELTA — https://teaching-resources.delta.ncsu.edu/rubric_best-practices-examples-templates/
12. Formative vs Summative — CMU Eberly — https://www.cmu.edu/teaching/assessment/basics/formative-summative.html
13. Distributed Practice meta-analysis (2025) — https://pmc.ncbi.nlm.nih.gov/articles/PMC12189222/
14. Retrieval Practice in Health Professions review (2025) — https://pmc.ncbi.nlm.nih.gov/articles/PMC12292765/
15. Dunlosky et al., high-utility strategies — https://www.aft.org/ae/fall2013/dunlosky
16. S2D2 / desirable-difficulties framework (2023) — https://link.springer.com/article/10.1007/s10648-023-09766-w
17. Feedback meta-analysis (2019), *Frontiers in Psychology* — https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2019.03087/full
18. Feedback-timing meta-analysis (2026), *Educational Psychology Review* — https://link.springer.com/article/10.1007/s10648-026-10117-8
19. Wery & Diliberto (2017), OpenDyslexic font — https://pmc.ncbi.nlm.nih.gov/articles/PMC5629233/
20. Dyslexie font / spacing study — https://pmc.ncbi.nlm.nih.gov/articles/PMC7188700/
21. What's New in WCAG 2.2 — W3C WAI — https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/
22. Making Content Usable for People with Cognitive & Learning Disabilities — W3C COGA (2021) — https://www.w3.org/TR/coga-usable/
23. Raymaker et al. (2019), AASPIRE Web Accessibility Guidelines — https://pmc.ncbi.nlm.nih.gov/articles/PMC6485264/
24. Self-Determination Theory (Ryan & Deci) — https://en.wikipedia.org/wiki/Self-determination_theory
25. Overjustification effect (Deci, Koestner & Ryan 2001) — https://en.wikipedia.org/wiki/Overjustification_effect
26. Goal Setting in Higher Education, systematic review (2024) — https://www.frontiersin.org/journals/education/articles/10.3389/feduc.2024.1511605/full
27. Goal-Setting Theory (Locke & Latham) — https://en.wikipedia.org/wiki/Goal-setting_theory
28. ARIA APG — Tabs — https://www.w3.org/WAI/ARIA/apg/patterns/tabs/
29. ARIA APG — Modal Dialog — https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/
30. Design Tokens Format Module 2025.10 (DTCG) — https://www.designtokens.org/tr/2025.10/format/
31. ARCHED: AI-assisted instructional design (2025) — https://arxiv.org/abs/2503.08931
32. Reliable generative-AI scaffolding (2025), *Computers & Education* — https://arxiv.org/abs/2508.05929
33. AI-generated assessment / Bloom-level skew (2025) — https://arxiv.org/abs/2504.14232
34. cmi5 (xAPI Profile) — ADL / xAPI.com — https://xapi.com/cmi5/
35. Pashler et al. (2008), learning-styles critique — via source #2.
36. CAST UDL Guidelines 3.0 — https://udlguidelines.cast.org/

---

## 8. Provenance & method

- **Source document:** `Leantime_Neuroinclusive_App_Design_Reference.docx` (12 Jul 2026) — the delivery
  layer and evidence-labeling scheme.
- **Research audit:** custom deep-research workflow (`coursework-design-research`), Jul 2026 — Sonnet
  fan-out across 6 angles (learning-science core; objectives/backward-design/assessment;
  retrieval/spacing/feedback; neuroinclusive/accessible instruction; motivation/gamification;
  authoring standards & agentic generation) → 76 candidate claims → Opus 3-vote adversarial verification
  (2/3 refutes to kill) → 31 survivors → Opus synthesis.
- **Caveat on verification:** the verifier was intentionally aggressive ("default to refuted if
  uncertain"), so 45 claims were "killed." Many killed claims are, in fact, well-established (e.g. Bloom's
  verb lists, backward design's three stages, the Dyslexie-font null result, Mayer's modality/redundancy
  principles, specific WCAG 2.2 SCs). They were flagged for *over-precise phrasing an agent couldn't
  independently re-confirm in one pass*, not for being false. Where such claims are sound and load-bearing,
  they have been re-incorporated above (e.g. OBJ-2, MM-5, NEU-1, backward design in §3) with appropriate labels.
- **Reconciliation note:** the synthesis agent built its audit against a summary of the source doc, not
  the file itself. This document reconciles that synthesis against the actual `.docx`. Before any future
  edit that contradicts the source guide, re-check the guide's real wording.
- **Full method:** see [`RESEARCH.md`](./RESEARCH.md) for the fan-out research design, the
  survived/killed breakdown, and how to extend the research base.

*Design principle (from both inputs): design for human variability, not a diagnostic average. Give
people control, reduce avoidable cognitive work, preserve meaning across representations, make the next
action easy to begin — and validate the result with the people it is meant to serve.*
