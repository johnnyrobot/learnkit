/**
 * LearnKit — platform / delivery-layer audit.
 *
 * Checks a web delivery layer (CSS + design tokens) against the platform-scoped rules:
 *   TEC-5  design tokens valid (DTCG format if token files exist)
 *   NEU-5  >=3 selectable palettes
 *   NEU-9  reduced-motion honored
 *   NEU-2  reader controls (line spacing / reading width)   [adjacent]
 *   states visible focus indicator (WCAG 2.4.7)             [adjacent]
 *
 * CLI: tsx src/audit-platform.ts [--dir <path>] [--json]   (default dir = cwd)
 * Exit code is non-zero if any ERROR-severity finding is present. Checks that need a running UI or
 * component parsing are listed under "needs human/component review" — never claimed as passing.
 */
import fs from "node:fs";
import path from "node:path";

type Severity = "error" | "warn" | "info" | "pass";
type Finding = { ruleId: string; severity: Severity; message: string; detail?: string[] };

const dirArg = (() => {
  const i = process.argv.indexOf("--dir");
  return i >= 0 && process.argv[i + 1] ? path.resolve(process.argv[i + 1]) : process.cwd();
})();

function walk(dir: string, test: (f: string) => boolean, out: string[] = [], depth = 0): string[] {
  if (depth > 8 || !fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if ([".git", "node_modules", ".next", ".wrangler", "dist", "build", "coverage"].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, test, out, depth + 1);
    else if (test(full)) out.push(full);
  }
  return out;
}
const read = (f: string) => fs.readFileSync(f, "utf8");
const rel = (f: string) => path.relative(dirArg, f) || path.basename(f);

const findings: Finding[] = [];
const add = (f: Finding) => findings.push(f);

// ---------- TEC-5: design tokens ----------
const tokenFiles = walk(dirArg, (f) => /\.tokens(\.json)?$/.test(f));
if (tokenFiles.length) {
  for (const file of tokenFiles) {
    let doc: unknown;
    try { doc = JSON.parse(read(file)); } catch (e) {
      add({ ruleId: "TEC-5", severity: "error", message: `invalid JSON in token file ${rel(file)}`, detail: [String(e)] });
      continue;
    }
    const problems: string[] = [];
    const refs = new Map<string, string[]>();
    const badName = /[$\{\}.]/;
    const isToken = (o: any) => o && typeof o === "object" && "$value" in o;
    const collectRefs = (v: unknown): string[] =>
      typeof v === "string" ? [...v.matchAll(/\{([^}]+)\}/g)].map((m) => m[1]) : [];
    const visit = (node: any, pathParts: string[], inheritedType: string | undefined) => {
      if (!node || typeof node !== "object") return;
      const type = node.$type ?? inheritedType;
      for (const [k, v] of Object.entries(node)) {
        if (k.startsWith("$")) continue;
        if (k !== "" && badName.test(k)) problems.push(`illegal token/group name "${k}" at ${pathParts.join(".")}`);
        const childPath = [...pathParts, k];
        if (isToken(v)) {
          const t = (v as any).$type ?? type;
          if (!t) problems.push(`token ${childPath.join(".")} has no $type (own or inherited)`);
          refs.set(childPath.join("."), collectRefs((v as any).$value));
        } else if (v && typeof v === "object") {
          visit(v, childPath, (v as any).$type ?? type);
        }
      }
    };
    visit(doc, [], undefined);
    const seen = new Set<string>(), stack = new Set<string>();
    const hasCycle = (n: string): boolean => {
      if (stack.has(n)) return true;
      if (seen.has(n)) return false;
      seen.add(n); stack.add(n);
      for (const r of refs.get(n) ?? []) if (hasCycle(r)) return true;
      stack.delete(n);
      return false;
    };
    for (const n of refs.keys()) if (hasCycle(n)) problems.push(`reference cycle involving ${n}`);
    if (!/\.tokens(\.json)?$/.test(file)) problems.push(`file should use the .tokens.json extension`);
    if (problems.length) add({ ruleId: "TEC-5", severity: "error", message: `${problems.length} DTCG violation(s) in ${rel(file)}`, detail: problems.slice(0, 8) });
    else add({ ruleId: "TEC-5", severity: "pass", message: `DTCG token file ${rel(file)} is valid` });
  }
} else {
  const cssFiles = walk(dirArg, (f) => f.endsWith(".css"));
  const themeVars = new Set<string>();
  for (const f of cssFiles) for (const m of read(f).matchAll(/--[\w-]*color[\w-]*/gi)) themeVars.add(m[0]);
  add({
    ruleId: "TEC-5",
    severity: "info",
    message: `no DTCG token files found; ${themeVars.size} color-ish CSS custom properties across ${cssFiles.length} stylesheet(s)`,
    detail: ["OK for a single-target web app. For multi-platform export (iOS/Android/design tools), adopt one DTCG .tokens.json source and generate CSS from it."],
  });
}

// ---------- CSS-based neuroinclusion checks ----------
const cssFiles = walk(dirArg, (f) => f.endsWith(".css"));
const allCss = cssFiles.map(read).join("\n");

if (!cssFiles.length) {
  add({ ruleId: "css", severity: "warn", message: `no .css files found under ${rel(dirArg) || dirArg} — pass --dir <path-to-your-styles>` });
}

// NEU-5: >=3 palettes.
const paletteSelectors = new Set<string>();
if (/@theme\s*\{|:root\s*\{/.test(allCss)) paletteSelectors.add("base (default)");
for (const m of allCss.matchAll(/\[data-(stimulation|color-mode|theme|contrast|mode)="([\w-]+)"\]/g))
  paletteSelectors.add(`${m[1]}=${m[2]}`);
if (/\.dark(\b|[\s,{])/.test(allCss)) paletteSelectors.add("class:.dark");
if (cssFiles.length)
  add(paletteSelectors.size >= 3
    ? { ruleId: "NEU-5", severity: "pass", message: `${paletteSelectors.size} palettes detected`, detail: [...paletteSelectors] }
    : { ruleId: "NEU-5", severity: "warn", message: `only ${paletteSelectors.size} palette(s) detected — target >=3 (e.g. default, low-stimulation, dark)`, detail: [...paletteSelectors] });

// NEU-9: reduced motion.
if (cssFiles.length) {
  const mediaRM = /@media\s*\([^)]*prefers-reduced-motion\s*:\s*reduce/.test(allCss);
  const appRM = /\[data-motion="(none|reduced)"\]/.test(allCss);
  add(mediaRM
    ? { ruleId: "NEU-9", severity: "pass", message: `prefers-reduced-motion honored${appRM ? " + in-app motion control present" : ""}` }
    : { ruleId: "NEU-9", severity: "error", message: `no @media (prefers-reduced-motion: reduce) rule found — animations may ignore the user/OS motion preference` });
}

// NEU-2: reader controls.
if (cssFiles.length) {
  const present = ([["line spacing", /\[data-line-spacing=/], ["reading width", /\[data-reading-width=/]] as const)
    .filter(([, re]) => re.test(allCss)).map(([n]) => n);
  add(present.length
    ? { ruleId: "NEU-2", severity: "pass", message: `reader controls present: ${present.join(", ")}` }
    : { ruleId: "NEU-2", severity: "warn", message: `no line-spacing/reading-width controls detected in CSS` });
}

// WCAG 2.4.7 visible focus.
if (cssFiles.length)
  add(/:focus-visible\s*\{[^}]*outline/.test(allCss)
    ? { ruleId: "states", severity: "pass", message: `:focus-visible outline present (WCAG 2.4.7)` }
    : { ruleId: "states", severity: "warn", message: `no :focus-visible outline rule found` });

// ---------- report ----------
const asJson = process.argv.includes("--json");
const notCheckable = [
  "NEU-5 switcher UI reachable on every page (needs rendered pages)",
  "NEU-6 breadcrumbs / stable nav positioning (needs rendered pages)",
  "NEU-7 one-interaction stop on auto-content + resume (needs component review)",
  "TEC-1..4 ARIA tabs/dialog/custom-widget patterns (needs component + a11y test, e.g. Playwright/axe)",
  "TEC-6 cmi5 packaging (needs LMS export path)",
];

if (asJson) {
  console.log(JSON.stringify({ dir: dirArg, findings, needsHumanReview: notCheckable }, null, 2));
} else {
  const icon = (s: Severity) => ({ error: "✗ ERROR", warn: "▲ WARN ", info: "· info ", pass: "✓ PASS " }[s]);
  console.log(`\n════ platform / delivery-layer audit — ${rel(dirArg) || dirArg} ════`);
  for (const f of findings) {
    console.log(`  ${icon(f.severity)} [${f.ruleId}] ${f.message}`);
    for (const d of f.detail ?? []) console.log(`           · ${d}`);
  }
  console.log(`\n──── needs human / component review (not auto-checkable) ────`);
  for (const n of notCheckable) console.log(`  · ${n}`);
  const errors = findings.filter((f) => f.severity === "error").length;
  console.log(`\n  ${errors} error-severity finding(s).`);
  process.exitCode = errors > 0 ? 1 : 0;
}
