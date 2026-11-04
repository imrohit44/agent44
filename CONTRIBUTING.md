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
- Add new synthetic scenarios in the `evaluation/` directory following the existing pattern
- Preserve frozen evaluation files; hash manifests verify integrity and are not an update mechanism
- Maintain the deterministic policy engine's fail-closed behavior

## Adding Synthetic Scenarios

1. Add a new scenario to the versioned corpus (`agent44.corpus`)
2. Update the test fixtures as needed
3. Check applicable frozen-file manifests and obtain the required review before changing any frozen artifact.
4. Document the scenario's expected decision and rule behavior

## Release Check

The repository contains `scripts/release_check.py`, but its current implementation
expects a root-level `assemble.py`, which is not present in this checkout. Do not
treat that script as a working release gate until its assumptions are repaired.
For routine Python validation, run the test and lint commands above.

## Questions or Discussion

- Open a discussion on the project's discussion board
- Contact the maintainers directly for complex changes