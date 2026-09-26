# Graph Report - .  (2026-07-17)

## Corpus Check
- Corpus is ~15,169 words - fits in a single context window. You may not need a graph.

## Summary
- 134 nodes · 141 edges · 11 communities (9 shown, 2 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Content Audit Engine|Content Audit Engine]]
- [[_COMMUNITY_Evidence Ruleset|Evidence Ruleset]]
- [[_COMMUNITY_Research Provenance|Research Provenance]]
- [[_COMMUNITY_Package Metadata|Package Metadata]]
- [[_COMMUNITY_Platform Audit Engine|Platform Audit Engine]]
- [[_COMMUNITY_TypeScript Configuration|TypeScript Configuration]]
- [[_COMMUNITY_Sample Course Data|Sample Course Data]]
- [[_COMMUNITY_Package Scripts|Package Scripts]]
- [[_COMMUNITY_Command Line Interface|Command Line Interface]]
- [[_COMMUNITY_Sample Regression Test|Sample Regression Test]]

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 12 edges
2. `meta` - 9 edges
3. `auditCourse()` - 8 edges
4. `scripts` - 7 edges
5. `Deduplicated 36-Source Bibliography` - 7 edges
6. `tierLegend` - 5 edges
7. `photosynthesis-basics` - 5 edges
8. `LearnKit Instructional Design Source of Truth` - 5 edges
9. `scopeLegend` - 4 edges
10. `checkTypeLegend` - 4 edges

## Surprising Connections (you probably didn't know these)
- `auditCourse()` --implements--> `LearnKit Content Schema`  [EXTRACTED]
  src/audit-content.ts → docs/CONTENT_SCHEMA.md
- `LearnKit README` --references--> `Machine-Readable Evidence-Tiered Ruleset`  [EXTRACTED]
  README.md → docs/RULES.json
- `auditCourse()` --implements--> `Machine-Readable Evidence-Tiered Ruleset`  [EXTRACTED]
  src/audit-content.ts → docs/RULES.json
- `LearnKit README` --references--> `LearnKit Research Provenance and Method`  [EXTRACTED]
  README.md → docs/RESEARCH.md
- `LearnKit README` --references--> `LearnKit Instructional Design Source of Truth`  [EXTRACTED]
  README.md → docs/SOURCE_OF_TRUTH.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Research Synthesis and Verification Pipeline** — docs_research_fan_out_research, docs_research_adversarial_verification, docs_research_verification_outcome, docs_source_of_truth_instructional_design_specification [EXTRACTED 1.00]
- **Research Bibliography Domains** — docs_source_of_truth_learning_science_sources, docs_source_of_truth_practice_feedback_sources, docs_source_of_truth_neuroinclusion_sources, docs_source_of_truth_motivation_sources, docs_source_of_truth_authoring_sources [EXTRACTED 1.00]
- **LearnKit Enforcement Architecture** — docs_source_of_truth_instructional_design_specification, docs_rules_ruleset, docs_content_schema_content_schema, src_audit_content_auditcourse, src_audit_platform_platform_audit [EXTRACTED 1.00]

## Communities (11 total, 2 thin omitted)

### Community 0 - "Content Audit Engine"
Cohesion: 0.12
Nodes (23): LearnKit Content Schema, auditCourse(), Bundle, contentAuto, Course, __dirname, Finding, first() (+15 more)

### Community 1 - "Evidence Ruleset"
Cohesion: 0.09
Nodes (22): auto, human, llm, meta, checkTypeLegend, derivedFrom, description, generated (+14 more)

### Community 2 - "Research Provenance"
Cohesion: 0.13
Nodes (17): Three-Vote Adversarial Verification, Six-Angle Fan-Out Research, LearnKit Research Provenance and Method, 76 Candidate Claims, 31 Survived, 45 Killed, Machine-Readable Evidence-Tiered Ruleset, Authoring Sources: ARIA APG, DTCG 2025.10, ARCHED, Reliable Generative-AI Scaffolding, AI Assessment Bloom Skew, cmi5, Design for Human Variability, Evidence-Labeling Protocol (+9 more)

### Community 3 - "Package Metadata"
Cohesion: 0.12
Nodes (15): bin, learnkit, description, devDependencies, tsx, @types/node, typescript, vitest (+7 more)

### Community 4 - "Platform Audit Engine"
Cohesion: 0.13
Nodes (10): allCss, asJson, cssFiles, dirArg, Finding, findings, notCheckable, paletteSelectors (+2 more)

### Community 5 - "TypeScript Configuration"
Cohesion: 0.14
Nodes (13): compilerOptions, esModuleInterop, forceConsistentCasingInFileNames, lib, module, moduleResolution, noEmit, resolveJsonModule (+5 more)

### Community 6 - "Sample Course Data"
Cohesion: 0.22
Nodes (8): _comment, courses, photosynthesis-basics, flashcards, lessons, objectivesByDomain, questions, version

### Community 7 - "Package Scripts"
Cohesion: 0.29
Nodes (7): scripts, audit, audit:platform, audit:sample, rules, test, typecheck

## Knowledge Gaps
- **89 isolated node(s):** `here`, `[cmd, ...rest]`, `$schema`, `name`, `version` (+84 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `auditCourse()` connect `Content Audit Engine` to `Research Provenance`?**
  _High betweenness centrality (0.052) - this node is a cross-community bridge._
- **Why does `Machine-Readable Evidence-Tiered Ruleset` connect `Research Provenance` to `Content Audit Engine`?**
  _High betweenness centrality (0.049) - this node is a cross-community bridge._
- **What connects `here`, `[cmd, ...rest]`, `$schema` to the rest of the system?**
  _91 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Content Audit Engine` be split into smaller, more focused modules?**
  _Cohesion score 0.12 - nodes in this community are weakly interconnected._
- **Should `Evidence Ruleset` be split into smaller, more focused modules?**
  _Cohesion score 0.08695652173913043 - nodes in this community are weakly interconnected._
- **Should `Research Provenance` be split into smaller, more focused modules?**
  _Cohesion score 0.1323529411764706 - nodes in this community are weakly interconnected._
- **Should `Package Metadata` be split into smaller, more focused modules?**
  _Cohesion score 0.125 - nodes in this community are weakly interconnected._