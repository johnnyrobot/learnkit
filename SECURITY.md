# Security Policy

## Reporting a vulnerability

Report privately via GitHub's
[security advisory form](https://github.com/johnnyrobot/learnkit/security/advisories/new). Please do
not open a public issue for a suspected vulnerability.

Expect an acknowledgement within 7 days.

## Supported versions

The latest release on `main` is the only supported version.

## Threat model

LearnKit is a pair of offline command-line auditors. Being clear about the small attack surface is
more useful than a long policy:

- **No runtime dependencies.** Everything ships with zero production deps; `tsx`, `typescript`,
  `vitest` and `@types/node` are dev-only.
- **No network access.** Neither auditor opens a socket. The `sourceUrl` values in
  `docs/RULES.json` are citations for humans; nothing fetches them.
- **No code execution from input.** Content files are parsed with `JSON.parse`. CSS and design-token
  files are read as text and matched with regular expressions. Nothing is `eval`'d, imported, or
  spawned.
- **Reads and writes.** The auditors read the paths you point them at and write only to stdout and
  stderr. `audit-platform --dir` walks the directory you name.

## What counts as a vulnerability

In scope: path traversal outside a supplied `--dir`, a crafted input file causing code execution,
catastrophic backtracking in a rule regex that hangs the process (ReDoS), or anything that makes the
auditor read or write a file you did not point it at.

Also in scope, and worth reporting even though it is not memory-unsafe: **an input that produces a
falsely clean audit.** LearnKit is used as a build gate, so a document that reports zero findings
without actually being audited defeats its purpose. That class of bug is treated as a real defect —
see `docs/CONTENT_SCHEMA.md` § Shape validation.

Out of scope: advisories in dev-only dependencies that do not affect anyone running the auditors, and
the accuracy or pedagogical merit of a rule — that is an issue or a PR, not a security report.
