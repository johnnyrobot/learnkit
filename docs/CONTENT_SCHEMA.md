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

## ID alignment

Objective IDs tie the model together. A lesson's `objectiveTags` and a question's `objective` are
matched to `objectivesByDomain[].objectives` by a **normalized key**: the auditor extracts the first
`\d+(\.\d+)+` run (so `"PB-1.1"`, `"1.1"`, and `"PHYS-1.1"` all normalize to `"1.1"`), falling back to
the trimmed string for non-numeric IDs. Keep IDs consistent so alignment checks (OBJ-7, SPC-2) work.

## What a clean course looks like

See [`../examples/sample-course.json`](../examples/sample-course.json) — it audits with zero findings.
Good-practice patterns it demonstrates: every objective is taught by ≥2 lessons (spacing, SPC-1), every
question carries a `cognitiveLevel` (ASM-3) and a per-choice rationale (FBK-1), the item mix favors
application over recall (ASM-3), and learning outcomes use single measurable verbs (OBJ-2).
