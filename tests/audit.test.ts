import { describe, it, expect } from "vitest";
import { auditCourse, loadCourses } from "../src/audit-content";

/**
 * The bundled sample course is a gold-standard example: it must audit with ZERO error-severity
 * findings out of the box. This is both a regression guard and a promise to forkers that the
 * example represents good practice. If you change the sample, keep it clean.
 */
describe("sample course", () => {
  const courses = loadCourses(new URL("../examples/sample-course.json", import.meta.url).pathname);

  for (const [id, course] of Object.entries(courses)) {
    const findings = auditCourse(id, course);
    const errors = findings.filter((f) => f.severity === "error");

    it(`${id}: no error-severity findings`, () => {
      expect(errors.map((e) => `${e.ruleId}: ${e.message}`)).toEqual([]);
    });

    it(`${id}: exercises the auditor (produces at least some findings or a clean pass)`, () => {
      // Sanity: the audit ran and returned an array (may be empty for a pristine course).
      expect(Array.isArray(findings)).toBe(true);
    });
  }
});
