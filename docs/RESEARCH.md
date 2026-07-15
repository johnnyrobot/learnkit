# LearnKit — research provenance & method

LearnKit's rules are not opinions; they are a synthesis of standards-body guidance and peer-reviewed
research, filtered through adversarial verification. This document records **how** the rule set was
produced so you can trust it, challenge it, or extend it.

## Origin

LearnKit began as an audit of the **Leantime Neuroinclusive App Design Reference Guide** (Jul 2026), a
source-backed handbook on neuroinclusive UI/UX, accessibility, and instructional design (ADHD, dyslexia,
autism, cognitive accessibility). That handbook supplied the delivery-surface layer — personalization,
design tokens, WCAG 2.2 + W3C COGA, an evidence-labeling discipline — and the observation that most
instructional-content pipelines lack exactly that discipline.

To turn it into a general, subject-agnostic engine for **designing and generating coursework**, a
fan-out research pass expanded the learning-science spine the handbook was thinner on: learning
objectives, cognitive load, multimedia learning, spacing/retrieval, feedback, assessment, motivation,
and machine-checkable authoring standards.

## Method — fan-out research with adversarial verification

A multi-agent workflow ran six research angles in parallel:

1. Learning-science core (UDL, cognitive load, multimedia learning, worked examples)
2. Objectives, backward design, assessment (Bloom's, UbD, constructive alignment, rubrics)
3. Retrieval, spacing, feedback (testing effect, distributed practice, desirable difficulties)
4. Neuroinclusive & accessible instruction (COGA, WCAG 2.2, dyslexia, autism/AASPIRE)
5. Motivation & engagement (Self-Determination Theory, gamification, goal-setting)
6. Authoring standards & agentic generation (DTCG tokens, ARIA APG, cmi5/xAPI, LLM-authoring failure modes)

Pipeline: broad web search → fetch authoritative sources → extract **falsifiable** claims, each tied to
a source URL → **3-vote adversarial verification** (a claim was killed if ≥2 of 3 independent skeptics
refuted it) → synthesis into encodable rules.

**Numbers:** 6 angles → **76 candidate claims** → **31 survived** verification → **45 killed**.

## Reading the verification honestly

The verifiers were deliberately aggressive — instructed to "default to refuted if uncertain." So the
45 "killed" claims are **not** a list of falsehoods. Many are well-established facts that simply could
not be independently re-confirmed at high confidence in a single pass, or were phrased with over-precise
specifics (exact effect sizes, exact guideline numbers). Examples of killed-but-sound claims:

- Bloom's revised-taxonomy verb lists per level
- Backward design's three-stage sequence (identify results → determine evidence → plan instruction)
- The Dyslexie-font null result (matched spacing on a standard sans-serif reproduces any benefit)
- Mayer's modality and redundancy principles
- Specific WCAG 2.2 success criteria (3.3.7, 3.3.8)

Where such claims are sound and load-bearing, they were **re-incorporated** into the rule set with
appropriate evidence labels. The lesson for anyone extending LearnKit: treat "killed" as "needs a
second look," not "false," and re-verify against the primary source before discarding.

## What the research changed vs. the original handbook

The handbook described how to *present* a lesson accessibly; the research added how to *architect
learning across time*. The eight gaps it closed:

1. Distributed/spaced practice as a temporal constraint (previously absent)
2. Two-dimensional Bloom's objectives (process × knowledge type)
3. Formative-before-summative gating with explicit stake labels
4. Rubric-descriptor mechanics (observable, impact-based, parallel)
5. Retrieval-after-instruction sequencing and multi-retrieval gating
6. Correcting the "faster feedback wins" myth (timing is not a reliable main effect)
7. A prohibited-outputs layer (learning-styles matching, dyslexia fonts, contrast-only, dopamine claims)
8. Machine-checkable authoring standards (ARIA APG, DTCG 2025.10, cmi5) and anti-automation gates

## Sources

The full deduplicated bibliography (36 sources: W3C COGA, WCAG 2.2, CAST UDL 3.0, Mayer, Sweller,
Dunlosky, Hattie & Timperley, Ryan & Deci, DTCG, 1EdTech, and peer-reviewed meta-analyses) lives in
[`SOURCE_OF_TRUTH.md` §7](./SOURCE_OF_TRUTH.md#7-source-bibliography-deduplicated-verification-surviving).
Every rule in [`RULES.json`](./RULES.json) carries its own `sourceUrl`.

## Extending the research

To add or revise a rule: run the same loop — find authoritative sources, extract a falsifiable claim,
adversarially verify it, then encode it with a `scope`, `tier`, `sourceUrl`, an automatable `Check:`,
and a before/after example. Prefer standards bodies and meta-analyses over blogs, and label contested
findings as `contested` with a test plan rather than promoting them to `strong`.
