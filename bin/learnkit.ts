#!/usr/bin/env -S npx tsx
/**
 * LearnKit CLI.
 *
 *   learnkit audit <file.json> [courseId] [--json]   audit instructional content
 *   learnkit audit-platform [--dir <path>] [--json]  audit a web delivery layer (CSS/tokens)
 *   learnkit rules [--json]                           list the rule set
 *   learnkit help
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const [cmd, ...rest] = process.argv.slice(2);

function runScript(file: string) {
  const r = spawnSync("npx", ["tsx", path.resolve(here, "..", "src", file), ...rest], { stdio: "inherit" });
  process.exit(r.status ?? 1);
}

switch (cmd) {
  case "audit":
    runScript("audit-content.ts");
    break;
  case "audit-platform":
    runScript("audit-platform.ts");
    break;
  case "rules": {
    const doc = JSON.parse(fs.readFileSync(path.resolve(here, "..", "docs", "RULES.json"), "utf8"));
    if (rest.includes("--json")) { console.log(JSON.stringify(doc, null, 2)); break; }
    for (const r of doc.rules)
      console.log(`${r.id.padEnd(8)} [${r.scope}/${r.tier}] ${r.title}`);
    console.log(`\n${doc.rules.length} rules, ${doc.prohibited.length} prohibited patterns. See docs/SOURCE_OF_TRUTH.md.`);
    break;
  }
  default:
    console.log(`LearnKit — neuroinclusive coursework kit

Usage:
  learnkit audit <file.json> [courseId] [--json]   audit instructional content
  learnkit audit-platform [--dir <path>] [--json]  audit a web delivery layer (CSS/tokens)
  learnkit rules [--json]                           list the ${""}rule set
  learnkit help

Docs: docs/SOURCE_OF_TRUTH.md · Rules: docs/RULES.json · Research: docs/RESEARCH.md`);
    process.exit(cmd && cmd !== "help" ? 2 : 0);
}
