# LearnKit content schema

`learnkit audit` reads a JSON file describing one or more courses and checks it against the
content-scoped rules in [`RULES.json`](./RULES.json). The schema is deliberately small and
subject-agnostic — adapt your own content pipeline to emit it, or map your existing format to it.

## Top level

The file is **either** a bundle of courses **or** a single course object.

```jsonc
// Bundle form (audited course-by-course):
{ "version": 2, "courses": { "<courseId>": <Course>, ... } }

// Single-course form (audited under the id "course"):
<Course>
```

## Course

```ts
type Course = {
  objectivesByDomain?: { domainName: string; objectives: string[] }[]; // objective IDs, grouped
  lessons?: Lesson[];
  questions?: Question[];
  flashcards?: Flashcard[];
};
```

## Lesson

```ts
type Lesson = {
  contentId: string;
  title: string;
  slug: string;
  order?: number;
  domainName?: string;
  estimatedMinutes?: number;   // used by STR-1 (segmenting)
  objectiveTags?: string[];    // objective IDs this lesson teaches (align with objectivesByDomain)
  body?: string;               // Markdown; linted for outcomes, vocab, visuals, readability
};
```

The auditor looks in `body` for a `## Learning Outcomes` (or `## Learning Objectives`) section and
lints each bullet (OBJ-2), and scans for a vocabulary/key-terms section (STR-2), images or tables
(MM-1), headings (MM-3), ALL-CAPS/wall-of-text (NEU-2), idioms (NEU-10), and learning-styles language
(MM-2, prohibited).

## Question

```ts
type Question = {
  contentId: string;
  objective?: string;          // objective ID this item assesses
  cognitiveLevel?: string;     // RECALL | UNDERSTAND | APPLY | ANALYZE | EVALUATE | CREATE  (ASM-3)
  stem?: string;
  choices?: string[];
  correctIndex?: number;
  choiceRationales?: string[]; // BEST: one informational rationale per choice (FBK-1)
  explanation?: string;        // acceptable fallback: a single question-level explanation
};
```

## Flashcard

```ts
type Flashcard = { contentId: string; objective?: string; front?: string; back?: string };
```

## Rubric

Optional. Omit `rubrics` entirely and RUB-1 is simply not applicable — it reports nothing rather
than pretending to have checked.

```ts
type RubricLevel = {
  label: string;       // e.g. "Developing" — keep the same set across every criterion (RUB-1)
  descriptor: string;  // observable performance and its consequence, not a grade
};
type RubricCriterion = { name: string; levels: RubricLevel[] };
type Rubric = {
  contentId: string;
  title?: string;
  domainName?: string;
  objective?: string;
  criteria: RubricCriterion[];
};
```

RUB-1 checks four descriptor mechanics:

| Severity | Condition |
|---|---|
| error | a descriptor that is empty, or whose whole substance is an evaluative adjective — `"Excellent work"`, `"Poor."`, `"Adequate"`. These grade the learner instead of describing the work |
| warn | a descriptor built on a tally with no consequence named — `"3 or more errors"`. Say what the errors *do*: `"Errors interrupt the reader often enough that they lose the thread"` |
| warn | criteria that do not share a parallel set of level labels, so the levels cannot be compared across criteria |
| info | descriptors totalling more than ~2500 characters — past roughly one page, a rubric stops being used |

An adjective appearing inside an otherwise concrete sentence is fine. The error fires only when the
adjective *is* the descriptor.

## Assessment type (ASM-1)

`Question.assessmentType` is `"formative"` or `"summative"`. Formative items are low-stakes practice;
summative items are graded.

| Severity | Condition |
|---|---|
| error | an item carries no `assessmentType` — the rule cannot be verified, so it is not claimed |
| error | an unrecognized value (anything but `formative` / `summative`) |
| error | a domain has summative items but no formative check — learners meet the graded item first |
| warn | a domain places a summative item before its first formative one |

Items are grouped into domains through the objective each one assesses. Ordering uses **document
order**, since that is the only sequence the schema carries — if your pipeline emits items out of
delivery order, sort them before auditing.

## ID alignment

Objective IDs tie the model together. A lesson's `objectiveTags` and a question's `objective` are
matched to `objectivesByDomain[].objectives` by a **normalized key**: the auditor extracts the first
`\d+(\.\d+)+` run (so `"PB-1.1"`, `"1.1"`, and `"PHYS-1.1"` all normalize to `"1.1"`), falling back to
the trimmed string for non-numeric IDs. Keep IDs consistent so alignment checks (OBJ-7, SPC-2) work.

## Shape validation

Every field above is optional, which means a document with the wrong shape would read as "no lessons,
no questions, no objectives" and audit perfectly clean. To stop a clean result from ever meaning "the
auditor could not find your content," the shape is checked before any rule runs.

**Refused at load (exit 2)** — the file is not auditable at all:

- anything that is not a JSON object (an array, a string, a number)
- a `courses` value that is not an object keyed by course ID, or is empty
- a single-course document containing none of `objectivesByDomain`, `lessons`, `questions`, `flashcards`

**Reported as `SCHEMA` findings** — the file loads, but part of it would be silently ignored:

| Severity | Condition |
|---|---|
| error | a course with no lessons, no questions and no objectives — nothing to audit |
| error | a collection given the wrong type (`"lessons": {}`), which would read as empty |
| error | an unrecognized field name inside `lessons`/`questions`/`flashcards`/`objectivesByDomain` — e.g. `prompt` instead of `stem`, which every rule would read as absent |
| error | a missing required field: `contentId`/`slug`/`title` on a lesson, `contentId`/`stem` on a question |
| warn | an unrecognized course-level field — harmless as metadata, but check for a misspelled collection key |

Keys beginning with `_` are treated as comments and never flagged.

## What a clean course looks like

See [`../examples/sample-course.json`](../examples/sample-course.json) — it audits with zero findings.
Good-practice patterns it demonstrates: every objective is taught by ≥2 lessons (spacing, SPC-1), every
question carries a `cognitiveLevel` (ASM-3) and a per-choice rationale (FBK-1), the item mix favors
application over recall (ASM-3), and learning outcomes use single measurable verbs (OBJ-2).

## What a flawed course looks like

See [`../examples/flawed-course.json`](../examples/flawed-course.json) — the counter-example, and the
proof that the auditor does something. It is schema-valid but pedagogically bad, and trips every rule
the content auditor implements: bare-ID objectives (OBJ-1), vague and doubled outcome verbs (OBJ-2), a
percentage target framed as an objective (OBJ-4), an objective no lesson teaches and a question that
assesses it anyway (OBJ-7, SPC-2), a single-exposure objective (SPC-1), an over-long lesson (STR-1)
that is term-dense with no vocabulary section, no visual and one heading (STR-2, MM-1, MM-3), a
learning-styles claim (MM-2, a prohibited pattern), an ALL-CAPS run and a wall-of-text paragraph
(NEU-2), emoji-only status markers (NEU-8), idioms (NEU-10), and items with no cognitive level and no
corrective feedback (ASM-3, FBK-1).

Do not "fix" it — `npm test` asserts it keeps failing, so that the sample being clean cannot be
satisfied by an auditor that has quietly stopped checking anything.
