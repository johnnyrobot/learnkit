# Contributing to LearnKit

Thanks for helping improve LearnKit.

## How to contribute

- Fork the repo and create a feature branch.
- Open a pull request with a clear summary and rationale.
- Keep changes focused and include any data/schema or rule updates in the same commit that updates tests/docs.

## Prerequisites

```bash
npm install
```

## Development checks

Run these locally before opening a PR:

```bash
npm run typecheck
npm run test
npm run audit:sample
```

## Code changes

- Favor explicit, conservative rule checks over broad heuristics.
- Keep `src` auditors deterministic.
- Prefer small, reviewable diffs.

## Documentation rules

- Repo docs use the shared license terms in [LICENSE-docs](LICENSE-docs).
- Update [docs/RULES.json](docs/RULES.json) and [docs/SOURCE_OF_TRUTH.md](docs/SOURCE_OF_TRUTH.md) together when behavior changes.
- If you adjust a rule’s meaning, update the matching `before/after/why` examples and tests.

## Release checks

- Ensure `npm run build` succeeds before merging release-branch changes.
