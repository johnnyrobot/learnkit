/**
 * LearnKit — programmatic API.
 *
 * A neuroinclusive-coursework toolkit: evidence-based rules, schemas, and auditors for designing and
 * generating instructional content for any subject.
 *
 * Example:
 *   import { auditCourse, loadCourses, ruleset } from "@johnnyrobot/learnkit";
 *   const courses = loadCourses("my-course.json");
 *   const findings = auditCourse("my-course", courses["course"]);
 *   const errors = findings.filter((f) => f.severity === "error");
 *
 * loadCourses throws on a document that matches neither accepted shape — catch it rather than
 * treating a failed load as a clean course.
 */
export {
  auditCourse,
  loadCourses,
  contentAuto,
  ruleById,
  ruleset,
  /** Rule IDs this auditor can actually emit — the honest answer to "what did you check?". */
  IMPLEMENTED_CONTENT_RULES,
  /** Content-scoped rules RULES.json marks automatable that are not implemented here. */
  UNIMPLEMENTED_CONTENT_RULES,
  type Course,
  type Finding,
  type Severity,
} from "./audit-content.js";
