import { describe, it, expect } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  auditCourse,
  loadCourses,
  contentAuto,
  IMPLEMENTED_CONTENT_RULES,
  UNIMPLEMENTED_CONTENT_RULES,
  type Course,
  type Finding,
} from "../src/audit-content";

const fixture = (name: string) => new URL(`../examples/${name}`, import.meta.url).pathname;

const auditAll = (file: string): Finding[] =>
  Object.entries(loadCourses(file)).flatMap(([id, course]) => auditCourse(id, course));

/** Write a throwaway JSON file so the loader's file-level validation can be exercised. */
const tmpJson = (value: unknown): string => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "learnkit-test-"));
  const file = path.join(dir, "input.json");
  fs.writeFileSync(file, JSON.stringify(value));
  return file;
};

/**
 * The sample course is the gold standard: it must audit with ZERO error-severity findings out of
 * the box. Both a regression guard and a promise to forkers that the example is good practice.
 */
describe("sample course (the positive fixture)", () => {
  const courses = loadCourses(fixture("sample-course.json"));

  it("audits at least one course", () => {
    expect(Object.keys(courses).length).toBeGreaterThan(0);
  });

  for (const [id, course] of Object.entries(courses)) {
    it(`${id}: no error-severity findings`, () => {
      const errors = auditCourse(id, course).filter((f) => f.severity === "error");
      expect(errors.map((e) => `${e.ruleId}: ${e.message}`)).toEqual([]);
    });
  }
});

/**
 * The counter-example is the mirror: a deliberately flawed course that must keep tripping every
 * rule the auditor implements. Without it, "the sample is clean" is equally satisfied by an
 * auditor that does nothing at all.
 */
describe("flawed course (the negative fixture)", () => {
  const findings = auditAll(fixture("flawed-course.json"));
  const tripped = new Set(findings.map((f) => f.ruleId));

  it("produces error-severity findings", () => {
    expect(findings.filter((f) => f.severity === "error").length).toBeGreaterThan(0);
  });

  it("trips every rule the auditor claims to check", () => {
    const missed = IMPLEMENTED_CONTENT_RULES.filter((id) => !tripped.has(id));
    expect(missed).toEqual([]);
  });
});

/**
 * Coverage honesty. The reported "audited" list is the auditor's public claim about what it
 * checked, so it may only name rules that (a) exist in RULES.json and (b) a fixture proves are
 * reachable. These two drifted apart once — the footer claimed OBJ-4, ASM-1, RUB-1 and NEU-8 while
 * nothing emitted them — which is exactly the overstatement the coverage footer exists to prevent.
 */
describe("coverage footer honesty", () => {
  const contentAutoIds = contentAuto.map((r) => r.id);

  it("claims no rule that RULES.json does not define as content+automatable", () => {
    expect(IMPLEMENTED_CONTENT_RULES.filter((id) => !contentAutoIds.includes(id))).toEqual([]);
  });

  it("accounts for every content+automatable rule as either implemented or explicitly not", () => {
    const accounted = [...IMPLEMENTED_CONTENT_RULES, ...UNIMPLEMENTED_CONTENT_RULES].sort();
    expect(accounted).toEqual([...contentAutoIds].sort());
  });

  it("emits no rule id outside the declared set", () => {
    const emitted = new Set(auditAll(fixture("flawed-course.json")).map((f) => f.ruleId));
    const declared = new Set<string>([...IMPLEMENTED_CONTENT_RULES, "SCHEMA"]);
    expect([...emitted].filter((id) => !declared.has(id))).toEqual([]);
  });
});

/**
 * Input-shape validation. Every Course field is optional, so an unrecognized shape would otherwise
 * default to "no content" and audit perfectly clean — a green build gate on content that was never
 * read. A clean audit must mean "read and passed", never "could not find it".
 */
describe("input shape validation", () => {
  it.each([
    ["an array", [1, 2, 3]],
    ["a bare object", {}],
    ["an object with no recognized fields", { totally: "wrong" }],
    ["a bundle with no courses", { courses: {} }],
    ["a bundle whose courses are not objects", { courses: { a: "nope" } }],
  ])("refuses %s", (_label, value) => {
    expect(() => loadCourses(tmpJson(value))).toThrow();
  });

  it("accepts a bare single course and a bundle alike", () => {
    expect(Object.keys(loadCourses(tmpJson({ lessons: [] })))).toEqual(["course"]);
    expect(Object.keys(loadCourses(tmpJson({ courses: { x: { lessons: [] } } })))).toEqual(["x"]);
  });

  it("reports a course with nothing in it rather than passing it", () => {
    const findings = auditCourse("empty", {} as Course);
    expect(findings.some((f) => f.ruleId === "SCHEMA" && f.severity === "error")).toBe(true);
  });

  it("reports drifted field names instead of reading them as absent content", () => {
    // `prompt`/`answer` are plausible-but-wrong names for `stem`/`correctIndex`. Before validation
    // this audited clean, because every rule simply read an empty string.
    const course = { questions: [{ contentId: "q1", prompt: "What?", answer: 0 }] } as unknown as Course;
    const schema = auditCourse("drifted", course).filter((f) => f.ruleId === "SCHEMA");
    expect(schema.some((f) => f.severity === "error" && /unrecognized field name/.test(f.message))).toBe(true);
    expect(schema.some((f) => f.severity === "error" && /missing/.test(f.message))).toBe(true);
  });

  it("reports a collection given the wrong type instead of silently reading it as empty", () => {
    const course = { lessons: {} } as unknown as Course;
    const findings = auditCourse("wrong-type", course);
    expect(findings.some((f) => f.ruleId === "SCHEMA" && /must be an array/.test(f.message))).toBe(true);
  });
});
