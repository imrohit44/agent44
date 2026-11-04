# Evaluation

Agent44 includes a deterministic runner (`agent44.eval_runner`) and a
hand-authored synthetic corpus (`agent44.corpus`). A result means that an
individual tool-call decision matched or differed from a pre-registered
scenario label. A DENY means that one call was not forwarded; it is not proof
that an attack objective failed.

## Corpus structure

The source corpus is version `4c.0.0`. Each `CorpusCase` has an ID, tool name,
argument mapping, category, label, expected `ALLOW`/`DENY`, rationale, and
provenance note. The validated category set contains:

- `benign-basic`
- `ambiguous-legitimate`
- `policy-violation`
- `hard-deny`
- `argument-constraint`
- `adapter-eligible`
- `adapter-malformed`
- `adapter-failure`
- `prompt-injection`
- `policy-bypass`
- `conflicting-rules`
- `ambiguous-adversarial`
- `hard-deny-invariance`

The development partition used in the Phase 10 artifacts has 94 distinct
scenarios. The source also has a pre-registered held-out partition, but the
reports state that held-out evaluation was not performed.

## Metrics and scope

- **Decision agreement/accuracy:** correctly decided, successfully evaluated
  scenarios divided by evaluated scenarios.
- **False allow:** an expected-DENY scenario whose observed policy action is
  ALLOW. The false-allow denominator is the executed expected-DENY scenarios.
- **False deny:** an expected-ALLOW scenario whose observed policy action is
  DENY. The false-deny denominator is the executed expected-ALLOW scenarios.
- **False-block rate:** blocked scenarios labeled benign divided by executed
  benign-labeled scenarios in the evaluator implementation. This is not
  identical to false-deny rate: the denominator is label-based, not simply all
  expected-ALLOW cases.
- **Attack-block rate:** the evaluator implementation counts DENY decisions
  over executed scenarios labeled malicious. It measures per-call decisions
  on this corpus, not whether an end-to-end attack objective was prevented.
- **Latency:** in the regular runner, client-observed wall time includes
  gateway/policy work and is not model-inference latency for rules-only or
  replay runs.

The runner records scenario-level and trial-level information. Repeated trials
are not independent scenarios; adapter comparisons aggregate repeated
outcomes within each scenario. Zero denominators are represented as `null`,
not as a measured zero percent.

## Baseline and adapter comparison

The frozen Phase 10 report and artifacts record:

| Condition | Scenarios | Trials | Allowed / denied | Agreement | False allows | False denies |
|---|---:|---:|---:|---:|---:|---:|
| Rules-only | 94 | 1 | 49 / 45 | 94/94 (1.000) | 0/45 | 0/49 |
| Rules + local judge | 94 | 3 for adapter cases | 53 / 41 | 90/94 (0.957) | 4/45 | 0/49 |

The judge condition used local Ollama `llama3.2:1b` at temperature 0. It
consulted the adapter for six `review_tool` scenarios and made 18 calls across
three trials per scenario. The other scenarios were decided by deterministic
rules. The report says the four backend changes were DENY-to-ALLOW, and all
four conflicted with the registered expected DENY labels.

These are development-corpus observations only. They are not measurements of
production incidents or generalization to unseen calls.

## Artifact inconsistencies

The checked-in Phase 10 summary and its JSON outputs are not fully reconciled:

- The report gives a rules-only false-block rate of `0/14`; the
  `condition_b_rules_only.json` summary gives `0/16`.
- The report says attack-block rate is not applicable because there are zero
  eligible attack scenarios. The same rules-only JSON summary reports
  `33/43` malicious-labeled calls blocked (about 0.767). This is a per-call
  corpus metric as defined by the evaluator, not end-to-end prevention.
- The Condition C report also lists attack-block rate as not applicable; its
  JSON metrics carry a zero denominator and `null` rate.

Until these figures are reconciled against the frozen protocol and run
configuration, treat the false-block and attack-block summary values as
unresolved. Do not cite the `33/43` value as an end-to-end security result.

A separate [conformance report](../evaluation/CONFORMANCE_RESULTS_REPORT_v1.md)
records `94/94` rules-only agreement for `PolicyEngine.evaluate()` versus the
registered development labels. That report explicitly scopes the result to
Layer A deterministic policy conformance; it is not a proxy-enforcement or
adapter evaluation.

## Reproducibility

The repository's regular runner accepts a development partition and JSON
output path:

```powershell
uv run python -m agent44.eval_runner run --partition development --output evaluation-results.json
```

The runner executes scenarios sequentially and records machine-readable JSON.
Rules-only runs do not call a model or network service. Local-model runs are
opt-in, restricted to the development partition, and require an already
installed local Ollama model. The checked-in `condition_c_judge.json` is
described by the Phase 10 report as an in-process run; the report does not
provide an independently reproducible, checked-in driver command for that
specific artifact.

The Phase 10 source report and JSON artifacts are preserved under
`evaluation/`. Do not modify frozen configuration, datasets, or results merely
to make a rerun match. See the
[synthetic evaluation protocol](../evaluation/SYNTHETIC_EVAL_PROTOCOL_v1.md)
and [development guide](development.md).

## Limitations

- The corpus is synthetic and hand-authored for the demo tool surface.
- The reports are development results; the held-out partition was not
  evaluated in these reports.
- Policy-decision correctness is not equivalent to end-to-end attack
  prevention. The runner does not establish whether an agent's larger
  multi-step objective succeeded.
- The report/JSON discrepancies above limit interpretation of selected
  secondary metrics.
- The experiment does not establish universal production security.
