# Development

## Repository setup

The Python project requires Python `>=3.11,<3.14`. From the repository root,
install the project and development dependencies with:

```powershell
uv sync
```

`uv run` executes commands in the project environment without requiring
manual activation.

## Python tests and lint

Run the Python suite:

```powershell
uv run pytest -q
```

Run the configured Ruff checks on implementation and tests:

```powershell
uv run ruff check src/ tests/
```

For focused work, select the relevant tests, for example:

```powershell
uv run pytest -q tests/test_policy.py tests/test_proxy.py tests/test_provenance.py
```

Python package metadata and the `agent44` console entry point are declared in
`pyproject.toml`. Its commands are `init`, `validate`, `run`, and `inspect`.
`agent44 run` forwards proxy options and the downstream server command to the
proxy implementation. The proxy can also be started directly as a module with
`uv run python -m agent44.proxy ...`; this module-based invocation remains
available to the repository's integration tests.

## TypeScript client

The package lives under `typescript/`:

```powershell
cd typescript
npm ci
npm test
npm run typecheck
```

The API/provenance tests, typecheck, and package build pass in the current
checkout. The ESM exports resolve to generated files, and `npm pack --dry-run`
includes only the distribution, package metadata, and Apache-2.0 license
notice. The package is not verified as an end-to-end client, and no npm
publication is established. See [TypeScript Client](typescript-client.md).

## Website development

The private React/Vite website source lives under `www/`. Its manifest defines
`npm run dev`, `npm run build`, `npm run lint`, and `npm run preview`.

```powershell
cd www
npm ci
npm run dev
```

At inspection time, `npm run build` did not reach Vite: its script invokes
`tsc`, but `www/` has no TypeScript project configuration. The website source
is present, but deployment/build status is unverified. No website files are
changed by this documentation.

## Contribution workflow

Follow [CONTRIBUTING.md](../CONTRIBUTING.md): keep changes aligned with the
existing style, run the relevant tests and Ruff checks, and document synthetic
scenario labels/rationale when adding a scenario. Do not alter frozen
evaluation configuration, corpus, or result files without the required
authorization and review.

Run the local validation gate from the repository root with:

```powershell
uv run python scripts/release_check.py
```

It regenerates `src/agent44/benchmark.py` from the benchmark fragments and
fails if the generated source changes, runs the Python tests, compares Ruff
findings with the structured, reviewed `.ruff_baseline.json`, and performs
import checks. The Ruff comparison rejects new findings by file, rule, message,
and source line while tolerating line-number shifts; baseline updates require
review and should not be made by blindly replacing the file with current
output. The historical Phase 9 hash manifest is not present in the current
repository. In its absence, the gate checks that `evaluation/` has no
working-tree changes; this is not a historical hash verification. The gate
does not build or publish distributions and does not establish release
readiness on its own.
There is no `.github/workflows/` release workflow in this checkout, so this
local gate is not run automatically by GitHub.

The Python wheel and source distribution can be built locally with
`uv build --wheel --sdist`. The TypeScript package is independently built from
`typescript/`; see [TypeScript Client](typescript-client.md). Neither command
publishes artifacts.

## Evaluation and documentation workflow

The standard evaluator can emit a JSON report:

```powershell
uv run python -m agent44.eval_runner run --partition development --output evaluation-results.json
```

Do not treat synthetic policy conformance as end-to-end security evidence.
Document the selected partition, decision source, trials, and denominators.
Keep frozen artifacts unchanged unless the applicable process explicitly
authorizes a change. See [Evaluation](evaluation.md).

## Validation notes

After restructuring, the full Python suite passed locally (`uv run pytest -q`:
538 passed). Pytest emitted an existing `pytest-asyncio` deprecation warning
because the async fixture loop scope is not configured explicitly. Current
TypeScript and website verification details are recorded in
[TypeScript Client](typescript-client.md) and
[Project Status in the README](../README.md#project-status).
