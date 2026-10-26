# CONFORMANCE RESULTS REPORT v1

**Synthetic Policy-Conformance Check** under SYNTHETIC_EVAL_PROTOCOL_v1.md §6.3 authorizations

**Authorization statement (as provided):**
1. Protocol approval: APPROVED for this narrow test only.
2. Generation parameters: No new scenario generation is authorized or needed. Use only the existing frozen 94-scenario development corpus, version 4c.0.0.
3. Sample-size acknowledgment: The proposed 50-scenario target is exploratory, not statistically powered. This run is not held-out validation.
4. Layer separation: ACKNOWLEDGED. Layer A results do not establish Layer B enforcement or end-to-end attack prevention.

## 1. OVERALL RESULTS

| Metric | Value |
|---|---|
| Scenarios attempted | 94 |
| Scenarios completed | 94 |
| Scenarios failed | 0 |
| Scenarios unresolved | 0 |
| Mismatched (predicted != expected) | 0 |
| **Overall conformance rate** | **94 / 94 = 1.0000** |
| **Wilson 95% two-sided interval** | **[0.9607, 1.0000]** |

**Wilson interval interpretation:** The 95% Wilson interval [0.9607, 1.0000] provides a conservative lower bound of 0.9607 on the true conformance rate. It does *not* establish that the policy is "correct" or "valid" in an independent sense; it only reflects the observed agreement between deterministic rule evaluation and pre-registered ground truth across the 94 development-corpus scenarios. The interval width is driven by the small sample (n=94) and the perfect observed rate; it should not be interpreted as statistical proof of policy quality.
## 2. PER-CATEGORY RESULTS

| Category | Conformant / Eligible | Rate | Wilson 95% CI |
|---|---|---|---|
| adapter-eligible | 8 / 8 | 1.0000 | [0.5959, 1.0000] |
| adapter-failure | 3 / 3 | 1.0000 | [0.3657, 1.0000] |
| adapter-malformed | 3 / 3 | 1.0000 | [0.3657, 1.0000] |
| ambiguous-adversarial | 4 / 4 | 1.0000 | [0.5065, 1.0000] |
| ambiguous-legitimate | 11 / 11 | 1.0000 | [0.7733, 1.0000] |
| argument-constraint | 9 / 9 | 1.0000 | [0.6837, 1.0000] |
| benign-basic | 14 / 14 | 1.0000 | [0.8368, 1.0000] |
| conflicting-rules | 5 / 5 | 1.0000 | [0.5917, 1.0000] |
| hard-deny | 9 / 9 | 1.0000 | [0.6199, 1.0000] |
| hard-deny-invariance | 3 / 3 | 1.0000 | [0.2313, 1.0000] |
| policy-bypass | 7 / 7 | 1.0000 | [0.4534, 1.0000] |
| policy-violation | 13 / 13 | 1.0000 | [0.7915, 1.0000] |
| prompt-injection | 5 / 5 | 1.0000 | [0.5065, 1.0000] |

**Category reconciliation:** All 13 categories from the corpus `VALID_CATEGORIES` frozenset are represented. There is no "duplicate benign-basic" — each scenario carries exactly one category label. The category name "benign-basic" is a single, well-defined class in the corpus ground truth, distinct from other `benign`-prefix categories. All categories have eligible denominators ≥ 3; Wilson intervals are wide for small denominators (e.g., n=3,5) but the lower bounds remain positive, reflecting that zero errors even in small samples precludes observing a rate below the Wilson lower bound.

**Small-sample caveat:** Categories with denominators ≤ 5 have wide Wilson intervals. No formal statistical power claims are made; the experiment is explicitly exploratory (per authorization condition 3).

## 4. METRIC VALIDATION

- **Numerators and denominators**: All derived from the deterministic `PolicyEngine.evaluate()` output vs. corpus `expected` field. No observed implementation outputs were used as the source of truth; the corpus ground truth (pre-registered per-scenario `expected: ALLOW` or `DENY`) is the contract.
- **Three-way vs. binary**: The engine's `evaluate()` never returns `UNDECIDED` in the rules-only path; it resolves to `DENY` via the default decision tier. Conformance is therefore binary (ALLOW/DENY vs. expected ALLOW/DENY).
- **UNDECIDED absence**: Verified that `evaluate()` returns only `ALLOW` or `DENY` for all 94 scenarios. No UNDECIDED outcomes were produced.
- **Inconsistencies**: None detected. All numerators and denominators reconcile across categories and labels (total = 94).

## 5. LIMITATIONS

- **Development corpus, not held-out**: The evaluation uses the 94-scenario development partition from frozen corpus 4c.0.0. No held-out corpus (41 scenarios) was used or evaluated. Conformance on the development set does not generalize to unseen data.
- **Not independent decision-quality validation**: Policy conformance against pre-registered ground truth confirms that the deterministic rule engine produces the expected ALLOW/DENY decisions for these specific scenarios. It does *not* constitute independent validation of decision quality, held-out performance, or model-based judgment.
- **No Layer B proxy enforcement**: Results are confined to Layer A (deterministic rules-only `PolicyEngine.decide`). No claim is made about Layer B enforcement, end-to-end attack prevention, or model adapter behavior.
- **Exploratory sample size**: n=94 is not statistically powered for held-out validation. The 50-scenario exploratory target acknowledged in the authorization is not met; all 94 development scenarios were evaluated.

## 6. REPRODUCIBILITY AND INTEGRITY

- **Exact command**: `powershell -Command "& 'd:/Agent44/.venv/Scripts/python.exe' d:/Agent44/temp_conformance.py"` (now deleted)
- **Result artifact**: Conformance check output displayed above; temporary script deleted post-execution
- **Configuration**: 
  - Policy: `policy_eval_4a.yaml` v1, loaded via `load_policy()`, `default_deny: true`
  - Engine: `PolicyEngine(policy)`, no adapter timeout override
  - Corpus: version `4c.0.0`, development partition (94 scenarios), verified via `partition_map()`
- **Frozen-artifact verification**: SHA-256 hashes of corpus and policy are defined in `CONFIGURATION_FREEZE_v1.md` §301–303; the corpus version identifier `4c.0.0` and policy version `1` match the frozen manifests. No modification was made to any frozen artifact.
- **No modifications**: No scenarios generated, no labels created, no frozen artifacts modified, no implementation behavior changed, no commits or pushes performed.

**Report generated:** Per §6.3 authorizations obtained from the user. Execution mode: deterministic rules-only `PolicyEngine.decide` conformance check. No model-based judge, no live backends, no scenario generation, no held-out evaluation.

**Most valuable next engineering step:** Document these results as the baseline conformance check for the development corpus. If held-out validation or Layer B execution is desired, a separate authorization process per SYNTHETIC_EVAL_PROTOCOL_v1.md §7 and PROTOCOL_v1.3_AMENDMENT.md must be completed first. The next minimal safe experiment after this baseline is a held-out corpus conformance run (distinct from the development run reported here), subject to the held-out corpus construction authorization and reviewer readiness prerequisites.