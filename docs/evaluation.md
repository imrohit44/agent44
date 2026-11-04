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

## Phase 10 metric reconciliation

The report and artifacts use two metric scopes. Protocol v1 §7 defines
label-based confusion metrics (`label=benign` or `label=malicious`). Protocol
v1.2 §9 defines Phase 10 eligibility metrics using `expected` plus a
benign/attack category. The two definitions are not interchangeable.

| Metric | Phase 10 report | Rules-only JSON (`condition_b_rules_only.json`) | Judge JSON (`condition_c_judge.json`) | Reconciliation |
|---|---|---|---|---|
| Allowed / denied | B: 49 / 45; C: 53 / 41 | 49 / 45 | 53 / 41 final per-scenario decisions | Counts agree. |
| Decision agreement | B: 94/94; C: 90/94 | 94/94 | 90/94 | Counts agree against the 94 registered `expected` outcomes. |
| False allows / false denies | B: 0 / 0; C: 4 / 0 | 0 / 0, denominators 45 / 49 | 4 / 0, denominators 45 / 49 | These are `expected=DENY` observed ALLOW and `expected=ALLOW` observed DENY, respectively. They agree. |
| False-block rate | B and C: 0/14 | 0/16 in the runner summary | 0/14 | The denominator differs by definition, not numerator: `16` counts all `label=benign` cases; `14` counts the `benign-basic` category under the Phase 10 category-based scope. The other two benign-labeled cases are in `adapter-eligible`. Both observed numerators are zero. |
| Attack-block rate | B and C: N/A, reported as 0 eligible attack scenarios | 33/43 malicious-labeled calls denied (0.767) | `null`, numerator 0, denominator 0 | The rules-only runner’s `33/43` uses Protocol v1’s `label=malicious` definition. Protocol v1.2 instead requires an executed `expected=DENY` scenario in an attack category. The frozen protocol does not map the corpus’s named categories to that eligibility set, and the Condition C run driver is not checked in. Therefore the Phase 10 `0/0` eligibility cannot be independently reconciled against the scenario records; retain it as unresolved rather than substituting `33/43`. |

The difference is not evidence that the conditions used different scenario
sets: both JSON files identify corpus version `4c.0.0`, development partition,
and the same 94 scenario IDs, with identical per-ID labels and expected
outcomes. It is a metric-definition and reporting-provenance mismatch. The
report's false-block `0/14` is consistent with the Phase 10 category-based
denominator, while the named rules-only JSON's top-level summary reports the
separate Protocol v1 label-based `0/16`. The report's attack-block N/A agrees
with the Condition C JSON fields, but not with the rules-only runner's
label-based `33/43`.

The exact attack-category eligibility mapping and the code that generated
Condition C's metric summary are not present in the frozen evidence. The
Condition C records include a malicious-labeled expected-DENY scenario changed
to ALLOW by the backend, while the summary reports zero newly allowed attacks;
this reinforces that its category-based attack metric cannot be independently
reconstructed from the available metric definition. Do not silently interpret
the zero denominator as a measured zero-percent attack-block rate.

In the runner implementation, a false allow is an expected-DENY scenario
observed as ALLOW; a false deny is an expected-ALLOW scenario observed as DENY.
These names are preferable to generic false-positive/false-negative terms,
whose meaning depends on which outcome is treated as the positive class.

Neither `33/43` nor the Phase 10 N/A is an end-to-end attack-prevention result.
The rules-only JSON sets `blocking: true` to identify the policy-enforced
condition, but sets `attack_success: null` and explicitly says that a DENY
only means one call was not forwarded. No frozen artifact measures whether a
multi-step attack objective succeeded. Do not claim end-to-end attack
prevention from these decision metrics.

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
- The Phase 10 attack-category denominator remains unresolved, limiting
  interpretation of that secondary metric.
- The experiment does not establish universal production security.
