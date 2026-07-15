/**
 * LearnKit — content audit.
 *
 * Validates instructional content against the automatable, content-scoped rules in
 * ../docs/RULES.json (derived from ../docs/SOURCE_OF_TRUTH.md).
 *
 * Input JSON is either:
 *   - a bundle:  { "courses": { "<id>": <Course>, ... } }
 *   - a single course object (audited under the id "course")
 * See ../docs/CONTENT_SCHEMA.md for the Course shape.
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
  stem?: string;
  choices?: string[];
  correctIndex?: number;
  choiceRationales?: string[];
  explanation?: string;
};
type Flashcard = { contentId: string; objective?: string; front?: string; back?: string };
export type Course = {
  objectivesByDomain?: ObjectiveDomain[];
  lessons?: Lesson[];
  questions?: Question[];
  flashcards?: Flashcard[];
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
const rulesPath = path.resolve(__dirname, "..", "docs", "RULES.json");
const ruleset = JSON.parse(fs.readFileSync(rulesPath, "utf8")) as Ruleset;
const ruleById = new Map(ruleset.rules.map((r) => [r.id, r]));
const contentAuto = ruleset.rules.filter((r) => r.scope === "content" && r.automatable);
export { contentAuto, ruleById, ruleset };

/** Load a content file. Accepts a bundle ({courses:{...}}) or a single Course object. */
export function loadCourses(file: string): Record<string, Course> {
  const doc = JSON.parse(fs.readFileSync(file, "utf8"));
  if (doc && typeof doc === "object" && "courses" in doc) return (doc as Bundle).courses;
  return { course: doc as Course };
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

const first = <T,>(arr: T[], n = 5): T[] => arr.slice(0, n);

// ---------- the audit ----------
export function auditCourse(id: string, course: Course): Finding[] {
  const findings: Finding[] = [];
  const lessons = course.lessons ?? [];
  const questions = course.questions ?? [];
  const objectiveIds = new Set(
    (course.objectivesByDomain ?? []).flatMap((d) => d.objectives.map((o) => normObj(o))),
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

  // OBJ-1 — objectives stored as bare ids without Bloom cells
  const bareObjectives = (course.objectivesByDomain ?? []).some((d) => d.objectives.every((o) => /^\d+(?:\.\d+)+$/.test(o.trim())));
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

  const pushList = (ruleId: string, sev: Severity, list: string[], label: string) => {
    if (list.length) findings.push({ ruleId, severity: sev, message: `${list.length} ${label}`, examples: first(list) });
  };
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
function runCli(): void {
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

  const notAudited = ruleset.rules.filter((r) => !(r.scope === "content" && r.automatable));
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
  console.log(`  audited (content + automatable): ${contentAuto.map((r) => r.id).join(", ")}`);
  console.log(`  NOT audited here (needs platform/pipeline/human review): ${notAudited.map((r) => r.id).join(", ")}`);
  console.log(`\n  ${totalErrors} error-severity finding(s) across ${ids.length} course(s).`);
  process.exitCode = totalErrors > 0 ? 1 : 0;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) runCli();
