/**
 * LearnKit — content audit.
 *
 * Validates instructional content against the automatable, content-scoped rules in
 * ../docs/RULES.json (derived from ../docs/SOURCE_OF_TRUTH.md).
 *
 * Input JSON is either:
 *   - a bundle:  { "courses": { "<id>": <Course>, ... } }
 *   - a single course object (audited under the id "course")
 * See ../docs/CONTENT_SCHEMA.md for the Course shape. The input shape is validated before any rule
 * runs: a document that matches neither form is refused (exit 2), and drifted field names or a
 * course with nothing in it report as error-severity SCHEMA findings. A clean audit therefore means
 * "content was read and passed", never "the auditor could not find the content".
 *
 * CLI:
 *   tsx src/audit-content.ts <file.json> [--json]     # audit a bundle or single course
 *   tsx src/audit-content.ts <file.json> <courseId>   # audit one course in a bundle
 *
 * Exit code is non-zero if any ERROR-severity finding is present. Rules that cannot be checked
 * from content alone are listed under "not audited here" so coverage is never overstated.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ---------- content model (see docs/CONTENT_SCHEMA.md) ----------
type ObjectiveDomain = { domainName: string; objectives: string[] };
type Lesson = {
  contentId: string;
  title: string;
  slug: string;
  order?: number;
  domainName?: string;
  estimatedMinutes?: number;
  objectiveTags?: string[];
  body?: string;
};
type Question = {
  contentId: string;
  objective?: string;
  cognitiveLevel?: string;
  /** ASM-1: "formative" (practice, low stakes) or "summative" (graded). */
  assessmentType?: string;
  stem?: string;
  choices?: string[];
  correctIndex?: number;
  choiceRationales?: string[];
  explanation?: string;
};
type Flashcard = { contentId: string; objective?: string; front?: string; back?: string };
/** RUB-1: one performance level of one criterion. */
type RubricLevel = { label: string; descriptor: string };
type RubricCriterion = { name: string; levels: RubricLevel[] };
type Rubric = { contentId: string; title?: string; domainName?: string; objective?: string; criteria: RubricCriterion[] };
export type Course = {
  objectivesByDomain?: ObjectiveDomain[];
  lessons?: Lesson[];
  questions?: Question[];
  flashcards?: Flashcard[];
  rubrics?: Rubric[];
};
type Bundle = { courses: Record<string, Course> };
type Rule = {
  id: string;
  category: string;
  title: string;
  tier: string;
  scope: "content" | "platform" | "pipeline";
  automatable: boolean;
  checkType: string;
  check: string;
  sourceUrl: string;
};
type Ruleset = { rules: Rule[]; prohibited: { id: string; pattern: string; contradicts: string }[] };

export type Severity = "error" | "warn" | "info";
export type Finding = { ruleId: string; severity: Severity; message: string; examples?: string[] };

// ---------- load ruleset ----------
/**
 * docs/ ships with the package and is read at runtime, but it sits at a different depth depending on
 * how this module is being run: `src/` in the repo, `dist/src/` from an install.
 */
function resolveRulesPath(): string {
  const candidates = [
    path.resolve(__dirname, "..", "docs", "RULES.json"), // repo:  src/  -> ../docs
    path.resolve(__dirname, "..", "..", "docs", "RULES.json"), // built: dist/src/ -> ../../docs
  ];
  const found = candidates.find((c) => fs.existsSync(c));
  if (!found) throw new Error(`cannot locate docs/RULES.json (looked in: ${candidates.join(", ")})`);
  return found;
}
const rulesPath = resolveRulesPath();
const ruleset = JSON.parse(fs.readFileSync(rulesPath, "utf8")) as Ruleset;
const ruleById = new Map(ruleset.rules.map((r) => [r.id, r]));
const contentAuto = ruleset.rules.filter((r) => r.scope === "content" && r.automatable);

/**
 * The rules auditCourse can actually emit a finding for. RULES.json's `automatable` flag says a rule
 * *could* be automated; this says it *is*. The two drifted apart once already — the footer claimed
 * OBJ-4, ASM-1, RUB-1 and NEU-8 while nothing in this file emitted them — so coverage is reported
 * from this set, never from the flag, and tests/audit.test.ts asserts the two stay reconciled.
 */
export const IMPLEMENTED_CONTENT_RULES = [
  "OBJ-1", "OBJ-2", "OBJ-4", "OBJ-7", "STR-1", "STR-2", "MM-1", "MM-2", "MM-3",
  "SPC-1", "SPC-2", "ASM-1", "ASM-3", "FBK-1", "RUB-1", "NEU-2", "NEU-8", "NEU-10",
] as const;

/** Content-scoped rules RULES.json marks automatable that this auditor does not yet check. */
export const UNIMPLEMENTED_CONTENT_RULES = contentAuto
  .filter((r) => !(IMPLEMENTED_CONTENT_RULES as readonly string[]).includes(r.id))
  .map((r) => r.id);

export { contentAuto, ruleById, ruleset };

// ---------- input shape validation ----------
/**
 * Every field on Course is optional, so an unrecognized or drifted input shape would default to
 * "no lessons, no questions, no objectives" and audit perfectly clean — reporting a green build
 * gate on content the auditor never actually read. Everything below exists to make that outcome
 * impossible: structurally impossible documents throw at load time, and misspelled field names
 * surface as error-severity SCHEMA findings instead of as a silent absence of findings.
 */
const COURSE_KEYS = ["objectivesByDomain", "lessons", "questions", "flashcards", "rubrics"] as const;
const LESSON_KEYS = ["contentId", "title", "slug", "order", "domainName", "estimatedMinutes", "objectiveTags", "body"];
const QUESTION_KEYS = ["contentId", "objective", "cognitiveLevel", "assessmentType", "stem", "choices", "correctIndex", "choiceRationales", "explanation"];
const FLASHCARD_KEYS = ["contentId", "objective", "front", "back"];
const DOMAIN_KEYS = ["domainName", "objectives"];
const RUBRIC_KEYS = ["contentId", "title", "domainName", "objective", "criteria"];

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

/** Load a content file. Accepts a bundle ({courses:{...}}) or a single Course object. */
export function loadCourses(file: string): Record<string, Course> {
  const doc = JSON.parse(fs.readFileSync(file, "utf8"));
  if (!isObj(doc))
    throw new Error(
      `unrecognized shape: expected a JSON object — a bundle {"courses":{…}} or a single course — but got ${Array.isArray(doc) ? "an array" : typeof doc}. See docs/CONTENT_SCHEMA.md`,
    );

  if ("courses" in doc) {
    const courses = doc.courses;
    if (!isObj(courses)) throw new Error(`"courses" must be an object keyed by course id. See docs/CONTENT_SCHEMA.md`);
    const notObjects = Object.entries(courses).filter(([, c]) => !isObj(c)).map(([k]) => k);
    if (notObjects.length) throw new Error(`course(s) not shaped as objects: ${notObjects.join(", ")}. See docs/CONTENT_SCHEMA.md`);
    if (!Object.keys(courses).length) throw new Error(`"courses" is empty — there is nothing to audit`);
    return courses as Record<string, Course>;
  }

  // Single-course form: require at least one recognized field, so junk cannot pass as an empty course.
  if (!COURSE_KEYS.some((k) => k in doc))
    throw new Error(
      `unrecognized shape: no "courses" key, and none of ${COURSE_KEYS.join(", ")}. See docs/CONTENT_SCHEMA.md`,
    );
  return { course: doc as Course };
}

/** Structural integrity of one course. Error-severity, because these defeat every rule below. */
function auditShape(course: Course): Finding[] {
  const out: Finding[] = [];
  const c = course as Record<string, unknown>;
  const unknownTop = Object.keys(c).filter((k) => !k.startsWith("_") && !(COURSE_KEYS as readonly string[]).includes(k));
  // Warn, not error: extra course-level metadata is harmless, and a misspelled collection key is
  // caught for real by the empty-content check below (or by OBJ-7 losing its lessons).
  if (unknownTop.length)
    out.push({
      ruleId: "SCHEMA",
      severity: "warn",
      message: `${unknownTop.length} unrecognized course field(s) — no rule reads them; check for a misspelled collection key`,
      examples: first(unknownTop.map((k) => `"${k}" (recognized: ${COURSE_KEYS.join(", ")})`)),
    });

  /** A present-but-wrong-typed collection is drift too: it silently becomes []. */
  const collection = (name: string, allowed: string[], idField: string, requiredFields: string[]): unknown[] => {
    const v = c[name];
    if (v === undefined) return [];
    if (!Array.isArray(v)) {
      out.push({ ruleId: "SCHEMA", severity: "error", message: `"${name}" must be an array, got ${isObj(v) ? "an object" : typeof v} — it is read as empty` });
      return [];
    }
    const unknownFields = new Set<string>();
    const missing: string[] = [];
    v.forEach((item, i) => {
      if (!isObj(item)) { missing.push(`${name}[${i}] is not an object`); return; }
      for (const k of Object.keys(item)) if (!k.startsWith("_") && !allowed.includes(k)) unknownFields.add(k);
      const label = typeof item[idField] === "string" ? String(item[idField]) : `${name}[${i}]`;
      for (const f of requiredFields) {
        const val = item[f];
        const present = typeof val === "string" ? val.trim().length > 0 : Array.isArray(val) && val.length > 0;
        if (!present) missing.push(`${label}: missing ${f}`);
      }
    });
    if (unknownFields.size)
      out.push({
        ruleId: "SCHEMA",
        severity: "error",
        message: `${unknownFields.size} unrecognized field name(s) in "${name}" — the rules read the documented names, so these carry no content`,
        examples: first([...unknownFields].map((k) => `${name}[].${k}`)),
      });
    if (missing.length)
      out.push({ ruleId: "SCHEMA", severity: "error", message: `${missing.length} required field(s) missing in "${name}"`, examples: first(missing) });
    return v;
  };

  const lessons = collection("lessons", LESSON_KEYS, "slug", ["contentId", "slug", "title"]);
  const questions = collection("questions", QUESTION_KEYS, "contentId", ["contentId", "stem"]);
  collection("flashcards", FLASHCARD_KEYS, "contentId", ["contentId"]);
  collection("rubrics", RUBRIC_KEYS, "contentId", ["contentId", "criteria"]);
  const domains = collection("objectivesByDomain", DOMAIN_KEYS, "domainName", ["domainName", "objectives"]);
  const objectiveCount = domains.reduce<number>(
    (n, d) => n + (isObj(d) && Array.isArray(d.objectives) ? d.objectives.length : 0),
    0,
  );

  // The vacuous pass: nothing to audit is a finding, never a clean bill of health.
  if (!lessons.length && !questions.length && !objectiveCount)
    out.push({
      ruleId: "SCHEMA",
      severity: "error",
      message: `no lessons, questions, or objectives — nothing was audited, so a clean result here would be meaningless`,
    });

  return out;
}

// ---------- helpers ----------
/** Normalize an objective reference like "PHOTO-1.3" or "1.1" to a shared key ("1.3"/"1.1"),
 *  falling back to the trimmed string for non-numeric ids. objective ids and objectiveTags must
 *  normalize to the same key to be considered aligned. */
const normObj = (s: string | undefined): string => (s ?? "").match(/\d+(?:\.\d+)+/)?.[0] ?? (s ?? "").trim();
const LONG_LESSON_MIN = 30; // STR-1 segmenting-candidate threshold (minutes)
const TERM_DENSE_CHARS = 3500; // STR-2 pre-training / MM-1 visual threshold
const WALL_PARA_CHARS = 650; // NEU-2 wall-of-text paragraph threshold
const RECALL_LEVELS = new Set(["RECALL", "REMEMBER", "KNOWLEDGE"]);
const VAGUE_VERBS = ["understand", "know", "learn", "be aware", "appreciate", "familiarize", "familiarise", "grasp", "comprehend", "realize", "realise", "gain knowledge"];
const IDIOMS = ["piece of cake", "hit the ground running", "low-hanging fruit", "move the needle", "bite the bullet", "on the same page", "think outside the box", "get up to speed", "boils down to", "in a nutshell", "ballpark", "under the hood", "rule of thumb", "cut corners"];
const STYLE_MATCH = /\b(visual|auditory|kinesthetic|kinaesthetic|tactile)\s+learner(s)?\b|\blearning styles?\b/i;
/** OBJ-4: score/percentage targets turn a mastery objective into a performance goal. */
const PERFORMANCE_GOAL = /\d{1,3}\s*(%|percent\b)|\bscor(e|ing)\b|\bat least \d+\s*(points?|marks?|questions?)\b|\bpass(ing)? (mark|rate|score)\b|\btop \d+\s*%/i;
/** ASM-1: the two assessment roles the rule distinguishes. */
const ASSESSMENT_TYPES = new Set(["formative", "summative"]);
/**
 * RUB-1: a descriptor whose substance is an evaluative adjective ("excellent work", "poor structure")
 * grades the learner instead of describing what the work does. Matches only when the adjective is the
 * descriptor's whole point — a passing mention inside a longer, concrete sentence is fine.
 */
const GENERIC_DESCRIPTOR =
  /^(?:\W*(?:very|highly|somewhat|fairly|generally|mostly|quite)\s+)?(?:work\s+is\s+)?(?:excellent|great|good|strong|solid|adequate|satisfactory|acceptable|average|fair|weak|poor|bad|inadequate|unsatisfactory|nice|decent)\b[\s\W]*(?:work|effort|quality|job|attempt|response|answer)?[\s\W]*$/i;
/** RUB-1: a descriptor built on tallies ("3 or more errors", "at least 5 sources"). */
const COUNT_DESCRIPTOR = /\b(?:\d+|one|two|three|four|five|no|zero|few|several)\s+(?:or\s+(?:more|fewer|less)\s+)?\w+s\b|\bat least \d+|\bno more than \d+|\bfewer than \d+/i;
/** RUB-1: language that names a consequence, which is what redeems a count. */
const IMPACT_LANGUAGE = /\b(?:so that|which|because|reader|user|audience|meaning|understand|follow|obscur|confus|clear|unclear|misleads?|prevents?|enables?|impact|result|consequence)/i;
/** RUB-1: rough "fits on one page" ceiling, in characters of descriptor text. */
const RUBRIC_PAGE_CHARS = 2500;
/** NEU-8: glyphs commonly used as a status indicator with no text equivalent. */
const STATUS_EMOJI =
  /[✅❌✓✔✖✗⚠⭕\u{1F534}\u{1F535}\u{1F6AB}\u{1F7E0}\u{1F7E1}\u{1F7E2}]/u;

const first = <T,>(arr: T[], n = 5): T[] => arr.slice(0, n);
/** Tolerate a missing or wrong-typed collection; auditShape has already reported it as a finding. */
const asArray = <T,>(v: T[] | undefined): T[] => (Array.isArray(v) ? v : []);

// ---------- the audit ----------
export function auditCourse(id: string, course: Course): Finding[] {
  // auditShape has already reported any wrong-typed collection; coerce so a bad input yields
  // findings rather than a TypeError halfway through the run.
  const findings: Finding[] = auditShape(course);
  const pushList = (ruleId: string, sev: Severity, list: string[], label: string) => {
    if (list.length) findings.push({ ruleId, severity: sev, message: `${list.length} ${label}`, examples: first(list) });
  };
  const lessons = asArray(course.lessons);
  const questions = asArray(course.questions);
  const domains = asArray(course.objectivesByDomain);
  const objectiveIds = new Set(
    domains.flatMap((d) => asArray(d?.objectives).map((o) => normObj(o))),
  );

  const lessonsByObjective = new Map<string, Lesson[]>();
  for (const l of lessons) {
    for (const tag of l.objectiveTags ?? []) {
      const key = normObj(tag);
      if (!lessonsByObjective.has(key)) lessonsByObjective.set(key, []);
      lessonsByObjective.get(key)!.push(l);
    }
  }
  const questionsByObjective = new Map<string, Question[]>();
  for (const q of questions) {
    const key = normObj(q.objective);
    if (!questionsByObjective.has(key)) questionsByObjective.set(key, []);
    questionsByObjective.get(key)!.push(q);
  }

  // OBJ-7 — backward-design alignment (objective coverage)
  const uncoveredByLesson = [...objectiveIds].filter((id) => !(lessonsByObjective.get(id)?.length));
  const uncoveredByQuestion = [...objectiveIds].filter((id) => !(questionsByObjective.get(id)?.length));
  if (uncoveredByLesson.length)
    findings.push({ ruleId: "OBJ-7", severity: "error", message: `${uncoveredByLesson.length} objective(s) have no lesson teaching them`, examples: first(uncoveredByLesson) });
  if (uncoveredByQuestion.length)
    findings.push({ ruleId: "OBJ-7", severity: "warn", message: `${uncoveredByQuestion.length} objective(s) have no assessment item`, examples: first(uncoveredByQuestion) });

  // SPC-2 — retrieval follows instruction (no item tests untaught material)
  const orphanQuestions = questions.filter((q) => {
    const key = normObj(q.objective);
    return (key && !objectiveIds.has(key)) || (key && !(lessonsByObjective.get(key)?.length));
  });
  if (orphanQuestions.length)
    findings.push({ ruleId: "SPC-2", severity: "error", message: `${orphanQuestions.length} assessment item(s) reference an objective no lesson teaches (or an unknown objective)`, examples: first(orphanQuestions.map((q) => `${q.contentId} → obj ${q.objective}`)) });

  // SPC-1 — spacing proxy: single-exposure objectives that are assessed
  const singleExposure = [...objectiveIds].filter((id) => (lessonsByObjective.get(id)?.length ?? 0) === 1 && (questionsByObjective.get(id)?.length ?? 0) > 0);
  if (singleExposure.length)
    findings.push({ ruleId: "SPC-1", severity: "info", message: `${singleExposure.length} objective(s) are taught in exactly one lesson (proxy: candidates for a spaced second exposure — verify against the delivery schedule, not just lesson count)`, examples: first(singleExposure) });

  // ASM-3 — cognitive level presence + recall skew
  const levelCounts: Record<string, number> = {};
  let missingLevel = 0;
  for (const q of questions) {
    const lvl = (q.cognitiveLevel ?? "").toUpperCase();
    if (!lvl) { missingLevel++; continue; }
    levelCounts[lvl] = (levelCounts[lvl] ?? 0) + 1;
  }
  if (missingLevel)
    findings.push({ ruleId: "ASM-3", severity: "error", message: `${missingLevel}/${questions.length} assessment item(s) have no cognitiveLevel — Bloom distribution cannot be verified` });
  const leveled = questions.length - missingLevel;
  const recall = Object.entries(levelCounts).filter(([k]) => RECALL_LEVELS.has(k)).reduce((a, [, v]) => a + v, 0);
  if (leveled > 0 && recall / leveled > 0.5)
    findings.push({ ruleId: "ASM-3", severity: "warn", message: `${Math.round((recall / leveled) * 100)}% of leveled items are recall-level — summative should favor application (Apply+)`, examples: [JSON.stringify(levelCounts)] });

  // FBK-1 — informational feedback. Ideal = per-choice rationale. Partial = a question-level explanation. Absent = neither.
  const hasPerChoice = (q: Question) => {
    const r = q.choiceRationales ?? [];
    return r.length >= (q.choices?.length ?? 0) && r.every((x) => x && x.trim().length >= 15);
  };
  const hasExplanation = (q: Question) => (q.explanation ?? "").trim().length >= 15;
  const noFeedback = questions.filter((q) => !hasPerChoice(q) && !hasExplanation(q));
  const explanationOnly = questions.filter((q) => !hasPerChoice(q) && hasExplanation(q));
  if (noFeedback.length)
    findings.push({ ruleId: "FBK-1", severity: "error", message: `${noFeedback.length}/${questions.length} item(s) have no corrective feedback at all (no per-choice rationale and no explanation)`, examples: first(noFeedback.map((q) => q.contentId)) });
  if (explanationOnly.length)
    findings.push({ ruleId: "FBK-1", severity: "warn", message: `${explanationOnly.length}/${questions.length} item(s) have only a question-level explanation, not per-choice rationales — per-choice feedback is more informational (tells the learner why each distractor is wrong)`, examples: first(explanationOnly.map((q) => q.contentId)) });

  // ASM-1 — a formative check must precede the summative items in each domain.
  // Document order is the only ordering the schema carries, so it stands in for delivery order;
  // an authoring pipeline that emits items out of sequence should sort before auditing.
  const labelled = questions.filter((q) => (q.assessmentType ?? "").trim());
  const unlabelled = questions.filter((q) => !(q.assessmentType ?? "").trim());
  const badLabels = labelled.filter((q) => !ASSESSMENT_TYPES.has(q.assessmentType!.trim().toLowerCase()));
  if (unlabelled.length)
    findings.push({ ruleId: "ASM-1", severity: "error", message: `${unlabelled.length}/${questions.length} assessment item(s) carry no assessmentType — formative-before-summative cannot be verified`, examples: first(unlabelled.map((q) => q.contentId)) });
  if (badLabels.length)
    findings.push({ ruleId: "ASM-1", severity: "error", message: `${badLabels.length} assessment item(s) have an unrecognized assessmentType (expected "formative" or "summative")`, examples: first(badLabels.map((q) => `${q.contentId}: "${q.assessmentType}"`)) });

  // Group by domain via the objective each item assesses; ungrouped items fall under one bucket.
  const domainOfObjective = new Map<string, string>();
  for (const d of domains)
    for (const o of asArray(d?.objectives)) domainOfObjective.set(normObj(String(o)), String(d.domainName ?? "(unnamed domain)"));
  const byDomain = new Map<string, Question[]>();
  questions.forEach((q) => {
    const key = domainOfObjective.get(normObj(q.objective)) ?? "(no domain)";
    if (!byDomain.has(key)) byDomain.set(key, []);
    byDomain.get(key)!.push(q);
  });
  const noFormative: string[] = [];
  const summativeFirst: string[] = [];
  for (const [domain, items] of byDomain) {
    const typeAt = (q: Question) => (q.assessmentType ?? "").trim().toLowerCase();
    const firstFormative = items.findIndex((q) => typeAt(q) === "formative");
    const firstSummative = items.findIndex((q) => typeAt(q) === "summative");
    if (firstSummative >= 0 && firstFormative < 0) noFormative.push(domain);
    else if (firstSummative >= 0 && firstFormative > firstSummative)
      summativeFirst.push(`${domain}: ${items[firstSummative].contentId} precedes ${items[firstFormative].contentId}`);
  }
  if (noFormative.length)
    findings.push({ ruleId: "ASM-1", severity: "error", message: `${noFormative.length} domain(s) have summative items but no formative check — learners meet the graded item first`, examples: first(noFormative) });
  if (summativeFirst.length)
    findings.push({ ruleId: "ASM-1", severity: "warn", message: `${summativeFirst.length} domain(s) place a summative item before the first formative one`, examples: first(summativeFirst) });

  // RUB-1 — rubric descriptor mechanics. N/A when the course carries no rubrics.
  const rubrics = asArray(course.rubrics);
  const genericDescriptors: string[] = [];
  const countDescriptors: string[] = [];
  const nonParallel: string[] = [];
  const overLong: string[] = [];
  for (const r of rubrics) {
    const criteria = asArray(r?.criteria);
    const levelShapes = new Set<string>();
    let descriptorChars = 0;
    for (const c of criteria) {
      const levels = asArray(c?.levels);
      levelShapes.add(levels.map((l) => String(l?.label ?? "").trim().toLowerCase()).join("|"));
      for (const l of levels) {
        const text = String(l?.descriptor ?? "").trim();
        descriptorChars += text.length;
        const where = `${r.contentId}/${c?.name ?? "?"}/${l?.label ?? "?"}`;
        // A descriptor carried by an evaluative adjective states a grade, not observable performance.
        if (!text || GENERIC_DESCRIPTOR.test(text)) genericDescriptors.push(`${where}: "${text.slice(0, 40)}"`);
        // A count with no consequence tells the learner what to tally, not what good work does.
        else if (COUNT_DESCRIPTOR.test(text) && !IMPACT_LANGUAGE.test(text)) countDescriptors.push(`${where}: "${text.slice(0, 40)}"`);
      }
    }
    if (levelShapes.size > 1) nonParallel.push(`${r.contentId}: criteria use different level sets (${levelShapes.size} variants)`);
    if (descriptorChars > RUBRIC_PAGE_CHARS) overLong.push(`${r.contentId} (${descriptorChars} chars of descriptors)`);
  }
  pushList("RUB-1", "error", genericDescriptors, "rubric descriptor(s) that are empty or rest on a generic evaluative adjective ('good', 'excellent', 'poor') instead of observable performance");
  pushList("RUB-1", "warn", countDescriptors, "rubric descriptor(s) that count occurrences without naming the impact on the reader/user");
  pushList("RUB-1", "warn", nonParallel, "rubric(s) whose criteria do not use a parallel set of performance levels");
  pushList("RUB-1", "info", overLong, `rubric(s) longer than roughly one page (>${RUBRIC_PAGE_CHARS} chars of descriptors)`);

  // OBJ-4 — mastery framing: an objective that states a score/percentage target is a performance goal
  const allObjectiveTexts = domains.flatMap((d) => asArray(d?.objectives));
  const performanceGoals = allObjectiveTexts.filter((o) => PERFORMANCE_GOAL.test(o));
  if (performanceGoals.length)
    findings.push({ ruleId: "OBJ-4", severity: "warn", message: `${performanceGoals.length} objective(s) state a score/percentage target — that is a performance goal; frame the objective around what the learner can do`, examples: first(performanceGoals) });

  // NEU-8 — status conveyed by emoji/color alone, with no text equivalent
  const emojiOnlyStatus: string[] = [];
  for (const l of lessons) {
    for (const line of (l.body ?? "").split("\n")) {
      // Table cells and list items are where status markers live; a cell of pure symbols has no text equivalent.
      const cells = /^\s*\|/.test(line) ? line.split("|").slice(1, -1) : /^\s*[-*]\s+/.test(line) ? [line.replace(/^\s*[-*]\s+/, "")] : [];
      for (const cell of cells) {
        const t = cell.trim();
        if (t && STATUS_EMOJI.test(t) && !/[A-Za-z0-9]/.test(t)) emojiOnlyStatus.push(`${l.slug}: "${t}"`);
      }
    }
  }
  if (emojiOnlyStatus.length)
    findings.push({ ruleId: "NEU-8", severity: "error", message: `${emojiOnlyStatus.length} emoji-only status marker(s) — status must carry a text equivalent, not colour/glyph alone`, examples: first(emojiOnlyStatus) });

  // OBJ-1 — objectives stored as bare ids without Bloom cells
  const bareObjectives = domains.some((d) => {
    const objs = asArray(d?.objectives);
    return objs.length > 0 && objs.every((o) => /^\d+(?:\.\d+)+$/.test(String(o).trim()));
  });
  if (bareObjectives)
    findings.push({ ruleId: "OBJ-1", severity: "warn", message: `objectives are stored as bare IDs (e.g. "1.1") with no objective text or two-dimensional Bloom cell — two-dimensional labeling (process × knowledge type) cannot be verified; recommend enriching the objective model` });

  // OBJ-2 / MM / STR / NEU — per-lesson body lint
  const outcomeVerbIssues: string[] = [];
  const longLessons: string[] = [];
  const noVocab: string[] = [];
  const noVisual: string[] = [];
  const thinSignaling: string[] = [];
  const capsWalls: string[] = [];
  const styleMatches: string[] = [];
  const idiomHits: string[] = [];

  for (const l of lessons) {
    const body = l.body ?? "";
    const sec = body.match(/##+\s*Learning (?:Outcomes|Objectives)[\s\S]*?(?=\n##\s|\n#\s|$)/i)?.[0] ?? "";
    for (const line of sec.split("\n").filter((x) => /^\s*[-*]\s+/.test(x))) {
      const text = line.replace(/^\s*[-*]\s+/, "").trim();
      const lower = text.toLowerCase();
      const vague = VAGUE_VERBS.find((v) => lower.startsWith(v));
      if (vague) outcomeVerbIssues.push(`${l.slug}: non-measurable verb "${vague}…"`);
      else if (/^\w+\s+\w+.*\b(and|then)\b\s+\w+/.test(lower) && /^(define|list|identify|describe|explain|apply|analyze|analyse|evaluate|create|compare|calculate|design|trace|diagnose|compose|build|justify)\b.*\b(and|then)\b\s+(define|list|identify|describe|explain|apply|analyze|analyse|evaluate|create|compare|calculate|design|trace|diagnose|compose|build|justify)\b/.test(lower))
        outcomeVerbIssues.push(`${l.slug}: two assessable verbs in one outcome ("${text.slice(0, 60)}…")`);
    }
    if ((l.estimatedMinutes ?? 0) > LONG_LESSON_MIN) longLessons.push(`${l.slug} (${l.estimatedMinutes}m)`);
    if (body.length > TERM_DENSE_CHARS && !/##+\s*(vocab|prerequisite|key terms|terminology|glossary)/i.test(body)) noVocab.push(l.slug);
    if (body.length > TERM_DENSE_CHARS && !/!\[/.test(body) && !/\n\s*\|.*\|/.test(body)) noVisual.push(l.slug);
    if (body.length > TERM_DENSE_CHARS && (body.match(/^\s*##+\s/gm)?.length ?? 0) < 2) thinSignaling.push(l.slug);
    if (/\b([A-Z]{3,}\s+){3,}[A-Z]{3,}\b/.test(body.replace(/`[^`]*`/g, ""))) capsWalls.push(`${l.slug}: ALL-CAPS run`);
    for (const para of body.split(/\n\s*\n/)) {
      const clean = para.replace(/\s+/g, " ").trim();
      if (clean.length > WALL_PARA_CHARS && !/^\s*[-*|#]/.test(para) && (clean.match(/[.!?]/g)?.length ?? 0) < clean.length / 400)
        { capsWalls.push(`${l.slug}: ${clean.length}-char paragraph`); break; }
    }
    if (STYLE_MATCH.test(body)) styleMatches.push(l.slug);
    for (const idi of IDIOMS) if (body.toLowerCase().includes(idi)) idiomHits.push(`${l.slug}: "${idi}"`);
  }
  for (const q of questions) if (STYLE_MATCH.test(q.stem ?? "")) styleMatches.push(`question ${q.contentId}`);

  pushList("OBJ-2", "warn", outcomeVerbIssues, "learning-outcome verb issue(s)");
  pushList("STR-1", "info", longLessons, `lesson(s) exceed ${LONG_LESSON_MIN}m (segmenting candidates)`);
  pushList("STR-2", "info", noVocab, "term-dense lesson(s) with no vocabulary/prerequisite section");
  pushList("MM-1", "info", noVisual, "term-dense lesson(s) with no image or table (dual-coding gap)");
  pushList("MM-3", "info", thinSignaling, "long lesson(s) with <2 section headings (weak signaling)");
  pushList("NEU-2", "warn", capsWalls, "readability issue(s) (ALL-CAPS run or wall-of-text)");
  pushList("MM-2", "error", styleMatches, "learning-styles reference(s) — PROHIBITED pattern");
  pushList("NEU-10", "info", idiomHits, "idiom(s)/non-literal phrase(s) (autistic-learner clarity)");

  return findings;
}

// ---------- CLI ----------
export function runCli(): void {
  const args = process.argv.slice(2);
  const asJson = args.includes("--json");
  const positional = args.filter((a) => !a.startsWith("--"));
  const file = positional[0] ?? path.resolve(__dirname, "..", "examples", "sample-course.json");
  const onlyId = positional[1];

  let courses: Record<string, Course>;
  try { courses = loadCourses(file); }
  catch (e) { console.error(`Cannot read ${file}: ${e instanceof Error ? e.message : e}`); process.exit(2); }

  const ids = onlyId ? [onlyId] : Object.keys(courses);
  const report: Record<string, Finding[]> = {};
  for (const id of ids) {
    if (!courses[id]) { console.error(`Unknown course: ${id}`); process.exitCode = 2; continue; }
    report[id] = auditCourse(id, courses[id]);
  }

  const notAudited = ruleset.rules.filter((r) => !(IMPLEMENTED_CONTENT_RULES as readonly string[]).includes(r.id));
  if (asJson) {
    console.log(JSON.stringify({ file, report, coverage: { audited: contentAuto.map((r) => r.id), notAuditedHere: notAudited.map((r) => r.id) } }, null, 2));
    return;
  }
  const icon = (s: Severity) => (s === "error" ? "✗ ERROR" : s === "warn" ? "▲ WARN " : "· info ");
  let totalErrors = 0;
  for (const id of ids) {
    const findings = report[id] ?? [];
    console.log(`\n════ ${id} ════`);
    if (!findings.length) { console.log("  ✓ no findings from content-scoped auto checks"); continue; }
    for (const f of findings.sort((a, b) => ("error warn info".indexOf(a.severity) - "error warn info".indexOf(b.severity)))) {
      if (f.severity === "error") totalErrors++;
      const rule = ruleById.get(f.ruleId);
      console.log(`  ${icon(f.severity)} [${f.ruleId}] ${f.message}`);
      if (rule) console.log(`           ↳ ${rule.title}  (${rule.tier})`);
      if (f.examples?.length) console.log(`           e.g. ${f.examples.join(" | ")}`);
    }
  }
  console.log(`\n──── coverage ────`);
  console.log(`  input shape: validated — unreadable shapes are refused, and misspelled fields or empty courses report as SCHEMA errors rather than passing silently`);
  console.log(`  audited (checked by this auditor): ${IMPLEMENTED_CONTENT_RULES.join(", ")}`);
  if (UNIMPLEMENTED_CONTENT_RULES.length)
    console.log(`  content-scoped but NOT yet implemented here: ${UNIMPLEMENTED_CONTENT_RULES.join(", ")}`);
  console.log(`  NOT audited here (needs platform/pipeline/human review): ${notAudited.filter((r) => !UNIMPLEMENTED_CONTENT_RULES.includes(r.id)).map((r) => r.id).join(", ")}`);
  console.log(`\n  ${totalErrors} error-severity finding(s) across ${ids.length} course(s).`);
  process.exitCode = totalErrors > 0 ? 1 : 0;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) runCli();
