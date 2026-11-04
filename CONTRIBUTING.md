# Contributing to Agent44

See the `README.md` for the project overview and setup instructions.

## Development Setup

1. Clone the repository and enter the directory
2. Install the project and development dependencies: `uv sync`
3. Run the Python test suite: `uv run pytest -q`
4. Run the Python linter: `uv run ruff check src/ tests/`

## Coding Guidelines

- Follow the existing code style in the repository
- Run `uv run ruff check src/ tests/` before committing
- Add synthetic scenarios to `src/agent44/corpus.py` following the existing pattern; keep frozen evaluation artifacts unchanged
- Preserve frozen evaluation files; hash manifests verify integrity and are not an update mechanism
- Maintain the deterministic policy engine's fail-closed behavior

## Adding Synthetic Scenarios

1. Add a new scenario to the versioned corpus (`agent44.corpus`)
2. Update the test fixtures as needed
3. Check applicable frozen-file manifests and obtain the required review before changing any frozen artifact.
4. Document the scenario's expected decision and rule behavior

## Release Check

From the repository root, run the offline local validation gate with
`uv run python scripts/release_check.py`. It checks generated benchmark-source
drift, the Python test suite, the Ruff baseline, imports, and evaluation-tree
working-copy status. The historical Phase 9 hash manifest is absent, so the
evaluation check is not a historical hash verification. The gate does not
build distributions or perform publication steps; it is not, by itself, a
complete release-readiness check.

Build Python distributions locally with `uv build --wheel --sdist`. Build and
inspect the TypeScript package from `typescript/`; see
[`docs/typescript-client.md`](docs/typescript-client.md). Do not publish
artifacts as part of local validation.

## Questions or Discussion

- Open a discussion on the project's discussion board
- Contact the maintainers directly for complex changes