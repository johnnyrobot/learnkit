#!/usr/bin/env node
/**
 * LearnKit CLI.
 *
 *   learnkit audit <file.json> [courseId] [--json]   audit instructional content
 *   learnkit audit-platform [--dir <path>] [--json]  audit a web delivery layer (CSS/tokens)
 *   learnkit rules [--json]                           list the rule set
 *   learnkit help
 *
 * Subcommands are imported, not spawned: the same file has to work run through tsx from the repo
 * and as compiled JS from an installed package, and only one of those has a tsx to spawn.
 */

// Only dynamic imports below, so mark this a module explicitly — top-level await needs it.
export {};

const [cmd, ...rest] = process.argv.slice(2);

/** Hand the subcommand its own argv, so it sees `<file> --json`, not `audit <file> --json`. */
const delegateArgv = () => {
  process.argv = [process.argv[0], process.argv[1], ...rest];
};

switch (cmd) {
  case "audit": {
    delegateArgv();
    const { runCli } = await import("../src/audit-content.js");
    runCli();
    break;
  }
  case "audit-platform": {
    delegateArgv();
    // A top-level script: importing it runs the audit and sets process.exitCode.
    await import("../src/audit-platform.js");
    break;
  }
  case "rules": {
    const { ruleset } = await import("../src/audit-content.js");
    if (rest.includes("--json")) { console.log(JSON.stringify(ruleset, null, 2)); break; }
    for (const r of ruleset.rules)
      console.log(`${r.id.padEnd(8)} [${r.scope}/${r.tier}] ${r.title}`);
    console.log(`\n${ruleset.rules.length} rules, ${ruleset.prohibited.length} prohibited patterns. See docs/SOURCE_OF_TRUTH.md.`);
    break;
  }
  default:
    console.log(`LearnKit — neuroinclusive coursework kit

Usage:
  learnkit audit <file.json> [courseId] [--json]   audit instructional content
  learnkit audit-platform [--dir <path>] [--json]  audit a web delivery layer (CSS/tokens)
  learnkit rules [--json]                           list the rule set
  learnkit help

Docs: docs/SOURCE_OF_TRUTH.md · Rules: docs/RULES.json · Research: docs/RESEARCH.md`);
    process.exit(cmd && cmd !== "help" ? 2 : 0);
}
