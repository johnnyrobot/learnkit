/**
 * LearnKit — programmatic API.
 *
 * A neuroinclusive-coursework toolkit: evidence-based rules, schemas, and auditors for designing and
 * generating instructional content for any subject.
 *
 * Example:
 *   import { auditCourse, loadCourses, ruleset } from "learnkit";
 *   const courses = loadCourses("my-course.json");
 *   const findings = auditCourse("my-course", courses["course"]);
 *   const errors = findings.filter((f) => f.severity === "error");
 */
export {
  auditCourse,
  loadCourses,
  contentAuto,
  ruleById,
  ruleset,
  type Course,
  type Finding,
  type Severity,
} from "./audit-content.js";
