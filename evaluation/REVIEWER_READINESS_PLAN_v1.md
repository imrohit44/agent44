## 1. Two Independent Reviewers

| Role | Identity | Qualifications | Availability | Status |
|------|----------|----------------|--------------|--------|
| Reviewer 1 | PENDING — to be assigned by evaluation lead | Proven experience with policy-engine evaluation or LLM safety evaluation. Familiar with Agent44 policy structure (policy_eval_4a.yaml), judge model (llama3.2:1b, judge-prompt-v1, temperature 0), and corpus categories (benign-basic, benign, ambiguous-adversarial, ambiguous-legitimate, prompt-injection, policy-bypass, conflicting-rules, adapter-eligible, hard-deny). Understanding of Wilson interval methodology and confidence-interval reporting. Can operate independently without model-decision exposure. Must sign a non-disclosure agreement and conflict-of-interest declaration. | PENDING — coordinate with evaluation lead | PENDING |
| Reviewer 2 | PENDING — to be assigned by evaluation lead | Same qualifications as Reviewer 1. Must be a different person than Reviewer 1. No prior involvement in pilot Phase 10 evaluation to ensure independence. | PENDING — coordinate with evaluation lead | PENDING |

Minimum qualifications bar: Each reviewer must independently verify they meet the qualifications before being assigned. Qualifications confirmation is a prerequisite for held-out corpus construction.
# Agent44 — Reviewer Readiness Plan v1

Status: DRAFT — All reviewer identities, availability, qualifications, adjudicator assignment, storage location, access permissions, and final protocol approval are marked PENDING until confirmed. Do not mark any approval as complete.

---
---
## 2. Blind Labeling Requirements

- Reviewers must NOT see: model decisions, each other's labels, or existing expected labels (ALLOW/DENY) for any scenario.
- Each reviewer receives the same held-out scenario set (as .json case files with id, tool_name, arguments, category only — no expected field, no model output, no prior labels).
- Labeling format: Each reviewer independently assigns ALLOW or DENY (or UNDECIDED if the category warrants it per the rubric) to each scenario.
- No communication: Reviewers must not discuss individual scenario decisions during the labeling phase.
- Output: Reviewers submit their label files (reviewer_1_labels.json, reviewer_2_labels.json) to the designated secure location; the adjudicator receives only aggregated statistics (agreement count, disagreement count, per-category breakdown) without revealing which reviewer assigned which label.

---
---
## 3. Label Definitions and Written Rationale

### 3.1 ALLOW
Meaning in the Agent44 decision contract: The tool call should be permitted; the policy engine should return ALLOW (or at minimum not return DENY).
Rationale for inclusion: Establishes the baseline policy-engine permission rate for benign and normally allowed tool calls.

### 3.2 DENY
Meaning in the Agent44 decision contract: The tool call should be blocked; the policy engine should return DENY.
Rationale for inclusion: Establishes the policy-engine block rate, including for security-relevant categories.

### 3.3 UNDECIDED (categories where applicable)
Categories: ambiguous-legitimate, ambiguous-adversarial, conflicting-rules, adapter-eligible
Rationale: When the deterministic policy returns UNDECIDED, the label assignment reflects whether the expected outcome under independent review is ALLOW or DENY. This is not a failure — it is a category-specific expected outcome.

Written rationale document (to be provided to both reviewers at the start of the labeling task):
> The Agent44 decision contract defines two primary outcomes: ALLOW (permitted) and DENY (blocked). These are not probabilistic — for any given scenario with a pre-registered expected field, the outcome is deterministically either ALLOW or DENY based on the policy rules as written. UNDECIDED is a transient engine state that only appears when no matching rule applies and the adapter (review_tool) is consulted. In the held-out evaluation, each scenario's expected field is pre-registered before any review; reviewers are not asked to infer or decide the outcome but to confirm whether the pre-registered expected outcome is correct given the scenario definition and the frozen policy configuration. Reviewers may note ambiguity but should record their confirmation/non-confirmation of the expected label, not assign a new label from scratch.

---
---
## 2. Blind Labeling Requirements

- Reviewers must NOT see: model decisions, each other's labels, or existing expected labels (ALLOW/DENY) for any scenario.
- Each reviewer receives the same held-out scenario set (as .json case files with id, tool_name, arguments, category only — no expected field, no model output, no prior labels).
- Labeling format: Each reviewer independently assigns ALLOW or DENY (or UNDECIDED if the category warrants it per the rubric) to each scenario.
- No communication: Reviewers must not discuss individual scenario decisions during the labeling phase.
- Output: Reviewers submit their label files (reviewer_1_labels.json, reviewer_2_labels.json) to the designated secure location; the adjudicator receives only aggregated statistics (agreement count, disagreement count, per-category breakdown) without revealing which reviewer assigned which label.

---
---
## 3. Label Definitions and Written Rationale

### 3.1 ALLOW
Meaning in the Agent44 decision contract: The tool call should be permitted; the policy engine should return ALLOW (or at minimum not return DENY).
Rationale for inclusion: Establishes the baseline policy-engine permission rate for benign and normally allowed tool calls.

### 3.2 DENY
Meaning in the Agent44 decision contract: The tool call should be blocked; the policy engine should return DENY.
Rationale for inclusion: Establishes the policy-engine block rate, including for security-relevant categories.

### 3.3 UNDECIDED (categories where applicable)
Categories: ambiguous-legitimate, ambiguous-adversarial, conflicting-rules, adapter-eligible
Rationale: When the deterministic policy returns UNDECIDED, the label assignment reflects whether the expected outcome under independent review is ALLOW or DENY. This is not a failure — it is a category-specific expected outcome.

Written rationale document (to be provided to both reviewers at the start of the labeling task):
> The Agent44 decision contract defines two primary outcomes: ALLOW (permitted) and DENY (blocked). These are not probabilistic — for any given scenario with a pre-registered expected field, the outcome is deterministically either ALLOW or DENY based on the policy rules as written. UNDECIDED is a transient engine state that only appears when no matching rule applies and the adapter (review_tool) is consulted. In the held-out evaluation, each scenario's expected field is pre-registered before any review; reviewers are not asked to infer or decide the outcome but to confirm whether the pre-registered expected outcome is correct given the scenario definition and the frozen policy configuration. Reviewers may note ambiguity but should record their confirmation/non-confirmation of the expected label, not assign a new label from scratch.

---
---
## 4. Designated Adjudicator and Disagreement-Resolution Process

| Role | Identity | Qualifications | Status |
|------|----------|----------------|--------|
| Adjudicator | PENDING — senior evaluation engineer | Deep knowledge of Agent44 policy engine, judge model, and corpus categories. Authority to resolve label disputes per the decision contract. Must not have participated as a reviewer in the current review cycle. Must sign conflict-of-interest declaration. | PENDING |

### 4.1 Disagreement-Resolution Procedure

1. Initial agreement: If both reviewers assign the same label (ALLOW or DENY) to a scenario, that label is accepted and recorded. No adjudication needed.
2. Disagreement detected: If the reviewers assign different labels, the scenario is flagged for adjudication.
3. Adjudicator review: The adjudicator reviews the scenario definition (id, tool_name, arguments, category) only — without seeing either reviewer's label, to avoid bias. The adjudicator also reviews: the frozen policy configuration (policy_eval_4a.yaml), the judge model and prompt version (llama3.2:1b, judge-prompt-v1, temperature 0), the decision contract rules as written, and the category-specific rubric (e.g., ambiguous-legitimate → UNDECIDED → adapter consultation → ALLOW/DENY).
4. Decision: The adjudicator assigns the correct expected label (ALLOW or DENY, or notes UNDECIDED if the category explicitly warrants it). The adjudicator's decision is final and binding.
5. Documentation: The adjudicator records the rationale in the held-out manifest (evaluation/held_out_manifest.json) under a dispute_resolutions entry, including: scenario ID, Reviewer 1's assigned label, Reviewer 2's assigned label, Adjudicator's resolved label, Rationale reference (decision contract rule ID, policy tier, etc.).
6. Escalation: If the adjudicator cannot resolve the dispute (e.g., the scenario truly sits on the boundary of two categories), the scenario is excluded from the scored denominator and documented in the manifest as "excluded — boundary case." All parties are notified, and the experiment lead is informed.

---
---
## 5. Handling Ambiguous Scenarios and Unresolved Disagreements

| Situation | Procedure |
|-----------|-----------|
| Category explicitly requires UNDECIDED expected outcome (e.g., ambiguous-legitimate, ambiguous-adversarial, conflicting-rules, adapter-eligible) | The adjudicator references the rubric in HOLDOUT_DATASET_PLAN_v1.md §4. If the category's typical expected is UNDECIDED → adapter consultation, the adjudicator records UNDECIDED as the expected outcome and the scenario is treated per the metric definitions (excluded from decision-accuracy/false-allow/false-deny rates; reported separately). |
| Reviewer disagreement on a non-ambiguous-category scenario | Adjudicator follows the procedure in §4. The adjudicator's decision is final. |
| Adjudicator cannot resolve the dispute | The scenario is excluded from the scored denominator and documented as "excluded — unresolved disagreement" in the manifest. The experiment lead is notified. The prior pilot data (Phase 10, 94 development scenarios) is not affected — only the held-out set is impacted. |
| Systemic pattern of disagreements (>20% of scenarios disputed) | The adjudicator produces a written analysis. The experiment lead, adjudicator, and (if needed) a second senior engineer review the pattern. Options include: (a) revising the category rubric for future held-out sets, (b) adjusting scenario definitions, or (c) accepting the current results with explicit documentation of the uncertainty. |

---
---
## 6. Initial Reviewer Agreement and Adjudication Reporting

### 6.1 Agreement Metrics (reported after labeling phase, before adjudication)

| Metric | Definition |
|--------|-----------|
| Per-scenario agreement | Count and proportion of scenarios where Reviewer 1 and Reviewer 2 assigned the same label. |
| Per-scenario disagreement | Count and proportion of scenarios where the reviewers disagreed. |
| Per-category agreement | Agreement proportion broken down by scenario category (benign-basic, benign, ambiguous-adversarial, etc.). |
| Overall agreement rate | Total agreements / total scenarios. |
| Cohen's kappa (optional) | Statistical measure of agreement beyond chance. |

### 6.2 Adjudication Reporting

After the adjudicator has resolved all disagreements, the following is reported in the held-out manifest and included in the evaluation summary:
- Initial agreement rate (before adjudication)
- Number of scenarios requiring adjudication
- Adjudicator-resolved labels and count
- Number of scenarios excluded as boundary/unresolved and rationale
- Final expected-label distribution (ALLOW count, DENY count, UNDECIDED count, excluded count)
- Rationale summary for each adjudicated dispute

---
---
## 7. Separation of Scenario Data, Reviewer Labels, and Model Evaluation Results

| Artifact | Storage Location | Access Permissions | Protection |
|----------|------------------|-------------------|------------|
| Held-out scenario definitions (.json with id, tool_name, arguments, category only) | d:\Agent44\evaluation\held_out_scenarios\ | Read-only for reviewers; no write access. Path restricted to evaluation team. | Files contain no expected field, no model output, no prior labels. |
| Reviewer 1 labels | d:\Agent44\evaluation\reviewer_1_labels.json | Write access restricted to Reviewer 1 and adjudicator. | Encrypted at rest; not visible to Reviewer 2 or any other party. |
| Reviewer 2 labels | d:\Agent44\evaluation\reviewer_2_labels.json | Write access restricted to Reviewer 2 and adjudicator. | Encrypted at rest; not visible to Reviewer 1 or any other party. |
| Adjudicator resolution | d:\Agent44\evaluation\adjudicator_resolution.json | Write access restricted to adjudicator and experiment lead. | Appended to the held-out manifest; not editable after sign-off. |
| Held-out manifest | d:\Agent44\evaluation\held_out_manifest.json | Read access for experiment lead, adjudicator, and authorized auditors. | SHA-256 hashes recorded; any modification generates a new experiment version (per CONFIGURATION_FREEZE_v1.md §3). |
| Model evaluation results (observed decisions) | d:\Agent44\evaluation\evaluation_results.json | Read access restricted to experiment lead and evaluation team. | Separate from reviewer labels; never shared with reviewers during the labeling phase. |
| Configuration freeze reference | d:\Agent44\evaluation\CONFIGURATION_FREEZE_v1.md (commit 0ff44ca) | Read access for all evaluation team members. | Frozen; no changes permitted without new experiment version. |

Key separation rule: No single artifact contains both reviewer labels and expected/observed model decisions. The held-out scenario definitions are stripped of any expected field before reviewers receive them. Model evaluation results are generated only after the expected labels are finalized and the adjudication process is complete.

---
---
## 8. Access Controls and Protection Against Held-Out-Data Leakage

### 8.1 Storage and Access
- Designated storage location: d:\Agent44\evaluation\ — all held-out-related files (held_out_scenarios/, reviewer_*_labels.json, adjudicator_resolution.json, held_out_manifest.json) must reside within this directory.
- Access permissions: Restricted to the evaluation team (as defined in METRICS_SAMPLE_SIZE_PROPOSAL_v1.md). No public disclosure without authorization.
- Git tracking: The held-out directory and its contents are not included in the git repository. They are generated and stored outside version control.

### 8.2 Leakage Prevention Measures
- No expected field in scenario files sent to reviewers. Reviewers receive only id, tool_name, arguments, category.
- Reviewers sign a data-access agreement prohibiting copying, sharing, or external discussion of scenario definitions or their own labels outside the authorized evaluation team.
- No model-decision exposure: Reviewers must not have access to any model outputs, observed decisions, or pilot results during the labeling phase.
- Manifest hashes: evaluation/held_out_manifest.json records SHA-256 hashes of all held-out scenario files, reviewer label files, and protocol version. Any unexpected change triggers an immediate pause (per HOLDOUT_DATASET_PLAN_v1.md "How accidental exposure or leakage will be handled").
- If held-out labels are discovered outside the designated storage location: The experiment must be paused immediately. The experiment lead must be notified. A new experiment version is issued, and a fresh held-out corpus is generated with new labels. The prior run's results are annulled for any tuning-related purpose (per HOLDOUT_DATASET_PLAN_v1.md).

### 8.3 Configuration Freeze Integration
- The configuration freeze identifier (AGENT44-CONFIG-FREEZE-v1, commit 0ff44ca, creation date 2026-10-22) must be recorded in the held-out manifest (per HOLDOUT_DATASET_PLAN_v1.md "Recorded configuration freeze identifier").
- Any change to the frozen policy file, judge model, prompt version, or corpus version requires a new experiment version and a freshly generated held-out set (per CONFIGURATION_FREEZE_v1.md "What happens if a policy, prompt, model, threshold, or evaluator must change after results are observed").

---
---
## 9. PENDING Items — Minimum Decisions Required Before Held-Out Corpus Construction

The following items must be resolved and confirmed before any held-out corpus is constructed or evaluation runs are authorized:

| # | Item | Current Status | Decision Required |
|---|------|----------------|-------------------|
| 1 | Reviewer 1 identity and qualification confirmation | PENDING | Evaluation lead must assign and verify qualifications |
| 2 | Reviewer 2 identity and qualification confirmation | PENDING | Evaluation lead must assign and verify qualifications (different from Reviewer 1) |
| 3 | Adjudicator assignment | PENDING | Senior evaluation engineer must be designated |
| 4 | Reviewer availability windows | PENDING | Coordination of labeling timeline |
| 5 | Blind-labeling protocol confirmation | PENDING | All parties agree on no-model-decision, no-cross-talk rules |
| 6 | Adjudicator disagreement-resolution procedure confirmation | PENDING | Procedure approved by experiment lead |
| 7 | Storage location and access-permission finalization | PENDING | d:\Agent44\evaluation/ permissions configured |
| 8 | Data-access agreements signed by reviewers | PENDING | Non-disclosure and conflict-of-interest documents executed |
| 9 | Configuration freeze identifier recorded in manifest | PENDING | AGENT44-CONFIG-FREEZE-v1 + commit 0ff44ca entered into held_out_manifest.json |
| 10 | Final protocol approval | PENDING | Experiment lead sign-off per CONFIGURATION_FREEZE_v1.md; new protocol version or amendment required |
| 11 | Held-out scenario generation method documented | PENDING | Scenario-generation method (category distribution, count, seed) documented and approved |
| 12 | Label rubric and resolution procedure finalized | PENDING | Written rationale for ALLOW/DENY per category; dispute-resolution process confirmed |
| 13 | Independent human-review sign-off | PENDING | Required per PROTOCOL_v1.3_AMENDMENT.md § Approved decisions |

Minimum decisions before held-out corpus construction (i.e, the absolute required set):
1. Reviewer 1 assigned and qualification-confirmed
2. Reviewer 2 assigned and qualification-confirmed (different from Reviewer 1)
3. Adjudicator designated
4. Storage location and access permissions configured
5. Reviewer data-access agreements signed
6. Configuration freeze identifier recorded in manifest
7. Final protocol approval obtained (experiment lead sign-off)
8. Held-out scenario generation method documented and approved
9. Label rubric and resolution procedure finalized

Until all 9 minimum decisions are confirmed, no held-out scenarios, labels, or evaluations must be generated, accessed, or run.

---
---
## 10. Document History

| Date | Action | Author |
|------|--------|--------|
| 2026-10-24 | Initial draft — reviewer readiness plan | Cline (AI coding agent) |

This file must not be modified after initial draft without a new experiment version. All PENDING items remain active until explicitly confirmed.

---