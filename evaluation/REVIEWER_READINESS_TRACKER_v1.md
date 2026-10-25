## Agent44 Reviewer Readiness Tracker v1
### Operational decision tracker based on REVIEWER_READINESS_PLAN_v1.md Section 9 and the Validation Report
### Covers all 13 pending decisions. Does not mark any approval, signature, permission, or configuration verification complete without evidence.
### Does not create scenarios, labels, datasets, or run evaluations. Does not modify frozen artifacts, policy configuration, corpus, fixtures, or existing planning documents.
| # | Decision | Owner Role | Required Evidence Type | Dependencies | Current Status | Action Needed to Resolve | Phase Blocking | Ambiguity |
|---|---|---|---|---|---|---|---|---|
| 1 | Reviewer 1 identity and qualification confirmation | Evaluation lead | Reviewer assignment record + qualification verification checklist (signed by reviewer) | None (prerequisite for all others) | PENDING | Evaluation lead must assign Reviewer 1 and verify they meet published qualifications (proven experience with policy-engine evaluation or LLM safety evaluation, familiar with Agent44 policy structure, judge model, corpus categories, Wilson interval methodology). Reviewer must sign NDA and conflict-of-interest declaration. | Corpus Construction (minimum #1), Layer A (reviewer quality) | Ambiguous whether qualification verification alone blocks Layer B or if additional policy-engine calibration needed |
| 2 | Reviewer 2 identity and qualification confirmation | Evaluation lead | Reviewer assignment record + qualification verification checklist (signed by reviewer) | Decision 1 (Reviewer 2 must be different person than Reviewer 1) | PENDING | Evaluation lead must assign Reviewer 2 (different from Reviewer 1) and verify qualifications per same checklist. Reviewer must sign NDA and conflict-of-interest declaration. | Corpus Construction (minimum #2), Layer A (reviewer quality) | Ambiguous whether "different person" check alone suffices or if explicit independence documentation required beyond COI declaration |
| 3 | Adjudicator assignment | Experiment lead / senior evaluation engineer | Adjudicator assignment record + sign-off confirmation | Decisions 1, 2 (reviewers must be assigned before adjudicator can act) | PENDING | Senior evaluation engineer must be designated as adjudicator. Adjudicator sign-off confirmation required. | Corpus Construction (minimum #3), Layer A (dispute resolution), Layer B (proxy enforcement oversight) | Ambiguous whether adjudicator must be senior evaluation engineer specifically, or if other roles qualify; ambiguity whether adjudicator sign-off blocks Layer B directly or only via dispute resolution |
| 4 | Reviewer availability windows | Evaluation lead and reviewers | Coordination record (shared calendar / availability overlap confirmation) | Decisions 1, 2 (reviewers must be assigned first) | PENDING | Coordination of labeling timeline between Evaluation lead and both reviewers. No specific time window claimed or implied as available. | Corpus Construction (additional) | FLAGGED: Decision does not explicitly appear in the 9 minimum corpus-construction prerequisites. Role in Layer A/B unclear. May be implicit prerequisite for scheduling but not called out as blocking any phase in plan. |
| 5 | Blind-labeling protocol confirmation | All evaluation team members | Protocol confirmation record (signed/all-agreed document) | Decisions 1, 2 (reviewers must be assigned before protocol applies) | PENDING | All parties agree on no-model-decision, no-cross-talk rules. Confirmation that reviewers will not see model decisions, each other's labels, or existing expected labels (ALLOW/DENY) for any scenario. | Corpus Construction (minimum indirect via §2-§7), Layer A (label integrity), Layer B (proxy enforcement depends on clean labels) | Ambiguous: protocol confirmation is described in Sections 2-7 but not explicitly listed among the 9 minimum prerequisites. Whether it blocks Layer B directly or only via label quality is not resolved in plan. |
| 6 | Adjudicator disagreement-resolution procedure confirmation | Experiment lead | Procedure approval record (experiment lead sign-off) | Decision 3 (adjudicator must be assigned before procedure can be confirmed) | PENDING | Procedure approved by experiment lead. Must define how adjudicator resolves disagreements between Reviewer 1 and Reviewer 2 labels. | Corpus Construction (additional), Layer A (dispute resolution), Layer B (proxy enforcement depends on resolved disputes) | Ambiguous: procedure confirmation not among the 9 minimum prerequisites. Whether Layer B can proceed with unresolved disputes documented but un-resolved is not specified. |
| 7 | Storage location and access-permission finalization | Experiment lead / IT admin | Storage access verification record + permission configuration log | None (infrastructure prerequisite) | PENDING | d:\Agent44\evaluation/ permissions configured. Storage location finalized with appropriate access permissions. | Corpus Construction (minimum #4), Layer A (data isolation), Layer B (proxy enforcement needs data access) | Ambiguous: whether specific permission levels (read-only vs read-write) are required for Layer B proxy enforcement, or if IT admin confirmation alone suffices |
| 8 | Data-access agreements signed by reviewers | Reviewers / evaluation lead | Signed non-disclosure and conflict-of-interest documents | Decisions 1, 2 (reviewers must be identified before agreements can be executed) | PENDING | Non-disclosure and conflict-of-interest documents executed by both reviewers. | Corpus Construction (minimum #5), Layer A (reviewer compliance), Layer B (proxy enforcement depends on compliant reviewers) | Ambiguous: whether agreements must be executed before Layer A begins or only before held-out corpus construction; whether evaluation lead countersignature required |
| 9 | Configuration freeze identifier recorded in manifest | Experiment lead | Manifest entry (AGENT44-CONFIG-FREEZE-v1 + commit 0ff44ca in held_out_manifest.json) | Decision 10 (final protocol approval should align with freeze) | PENDING | AGENT44-CONFIG-FREEZE-v1, commit 0ff44ca, creation date 2026-10-22 entered into held_out_manifest.json. | Corpus Construction (minimum #6), Layer A (frozen policy integrity), Layer B (proxy enforcement on frozen config) | Minimal ambiguity: configuration freeze identifier is consistently referenced across all documents; mapping to phases is clear |
| 10 | Final protocol approval | Experiment lead | Experiment lead sign-off record (per CONFIGURATION_FREEZE_v1.md); new protocol version or amendment if changed | Decisions 7, 9 (storage and configuration freeze should be finalized first) | PENDING | Experiment lead sign-off per CONFIGURATION_FREEZE_v1.md. New protocol version or amendment required if policy, prompt, model, threshold, or evaluator changed after results observed. | Corpus Construction (minimum #7), Layer A (protocol quality gate), Layer B (proxy enforcement requires approved protocol) | Minimal ambiguity: explicit in CONFIGURATION_FREEZE_v1.md; clear blocking relationship |
| 11 | Held-out scenario generation method documented | Experiment lead | Documentation record (category distribution, count, seed; approval record) | Decisions 9, 10 (configuration freeze and protocol approval should be documented first) | PENDING | Scenario-generation method (category distribution, count, seed) documented and approved. | Corpus Construction (minimum #8), Layer A (methodology quality), Layer B (proxy enforcement on documented methodology) | Minimal ambiguity: method documentation is a clear prerequisite; mapping to phases is straightforward |
| 12 | Label rubric and resolution procedure finalized | Experiment label | Written rationale for ALLOW/DENY per category + dispute-resolution process confirmation | Decisions 5 (blind-labeling protocol), 6 (adjudicator procedure) | PENDING | Written rationale for ALLOW/DENY per category; dispute-resolution process confirmed. Categories: benign-basic, benign, ambiguous-adversarial, ambiguous-legitimate, prompt-injection, policy-bypass, conflicting-rules, adapter-eligible, hard-deny. | Corpus Construction (minimum #9), Layer A (label quality gate), Layer B (proxy enforcement depends on resolved labels) | Moderate ambiguity: rubric finalization depends on blind-labeling protocol confirmation (Decision 5) and adjudicator procedure confirmation (Decision 6), which are not among the 9 minimum prerequisites. Chain of dependencies should be tracked. |
| 13 | Independent human-review sign-off | Experiment lead | Human-review sign-off record per PROTOCOL_v1.3_AMENDMENT.md | Decisions 10, 12 (protocol approval and label rubric should be finalized first) | PENDING | Independent human-review sign-off required per PROTOCOL_v1.3_AMENDMENT.md § Approved decisions. | Corpus Construction (additional), Layer A (independent quality gate), Layer B (proxy enforcement requires human sign-off) | FLAGGED: Decision is explicitly identified as additional (beyond the 9 minimum). Whether it blocks Layer B directly or only serves as final quality certification is not resolved in plan. Requires PROTOCOL_v1.3_AMENDMENT.md review for precise blocking semantics. |
### Nine Minimum Corpus-Construction Prerequisites (from Section 9, items 1-9)

| # | Decision | Required Before Held-Out Corpus Construction |
|---|---|---|
| 1 | Reviewer 1 assigned and qualification-confirmed | Evaluation lead assigns Reviewer 1; reviewer signs NDA/COI; qualifications verified |
| 2 | Reviewer 2 assigned and qualification-confirmed (different from Reviewer 1) | Evaluation lead assigns Reviewer 2 (different person); reviewer signs NDA/COI; qualifications verified |
| 3 | Adjudicator designated | Senior evaluation engineer designated; sign-off confirmation |
| 4 | Storage location and access permissions configured | d:\Agent44\evaluation/ permissions configured; access verification |
| 5 | Reviewer data-access agreements signed | Non-disclosure and conflict-of-interest documents executed by both reviewers |
| 6 | Configuration freeze identifier recorded in manifest | AGENT44-CONFIG-FREEZE-v1 + commit 0ff44ca entered into held_out_manifest.json |
| 7 | Final protocol approval obtained (experiment lead sign-off) | Experiment lead sign-off per CONFIGURATION_FREEZE_v1.md; new protocol version/amendment if needed |
| 8 | Held-out scenario generation method documented and approved | Category distribution, count, seed documented and approved |
| 9 | Label rubric and resolution procedure finalized | Written rationale for ALLOW/DENY per category; dispute-resolution process confirmed |
### Four Additional Decisions (beyond the 9 minimum corpus-construction prerequisites)

| # | Decision | Category | Notes |
|---|---|---|---|
### Layer A Prerequisites (policy-engine decision quality)
_(These decisions must be resolved before Layer A (policy-engine decision quality) can proceed)_

| Decision # | Blocking Condition |
|---|---|
| 1 | Reviewer 1 qualification-confirmed → enables Layer A label generation |
| 2 | Reviewer 2 qualification-confirmed (≠R1) → enables Layer A label generation |
### Layer B Prerequisites (full proxy enforcement)
_(These decisions must be resolved before Layer B (full proxy enforcement) can proceed)_

| Decision # | Blocking Condition |
|---|---|
| 4 | Reviewer availability windows coordinated → scheduling prerequisite (ambiguous if this blocks Layer B or only enables scheduling) |
| 7 | Storage location and access permissions configured → enables Layer B data access |
| 8 | Data-access agreements signed → enables Layer B reviewer compliance |
| 9 | Configuration freeze identifier recorded → enables Layer B on frozen config |
| 10 | Final protocol approval obtained → enables Layer B protocol gate |
| 11 | Held-out scenario generation method documented → enables Layer B methodology |
| 12 | Label rubric and resolution procedure finalized → enables Layer B label quality assessment |
| 13 | Independent human-review sign-off → enables Layer B quality certification |
| 3 | Adjudicator designated → enables Layer A dispute resolution |
| 5 | Blind-labeling protocol confirmed → enables Layer A independent labels |
| 6 | Adjudicator disagreement-resolution procedure confirmed → enables Layer A dispute resolution |
### Operational Constraints (do not violate)
- Do not create scenarios, labels, or datasets
- Do not run evaluations or live calls
- Do not modify frozen artifacts, policy configuration, corpus, fixtures, or existing planning documents
- Do not claim that people are available, or mark approvals, signatures, permissions, or configuration verification complete without evidence
- Do not invent reviewer names
- Do not commit or push

### First Real-World Action Required

**Action**: Evaluation lead must assign Reviewer 1 and verify published qualifications per the stated criteria (proven experience with policy-engine evaluation or LLM safety evaluation, familiarity with Agent44 policy structure (policy_eval_4a.yaml), judge model (llama3.2:1b, judge-prompt-v1, temperature 0), and corpus categories (benign-basic, benign, ambiguous-adversarial, ambiguous-legitimate, prompt-injection, policy-bypass, conflicting-rules, adapter-eligible, hard-deny). Understanding of Wilson interval methodology and confidence-interval reporting. The reviewer must be able to operate independently without model-decision exposure. Must sign a non-disclosure agreement and conflict-of-interest designation.

**Responsible**: Evaluation lead  
**Blocks**: Until Reviewer 1 is assigned and qualified, no held-out corpus construction can proceed (minimum prerequisite #1). Layer A (policy-engine decision quality) cannot begin without a qualified Reviewer 1.  
**Evidence Required**: Reviewer assignment record + qualification verification checklist signed by the reviewer, including NDA and conflict-of-interest declaration.

**Next steps after Reviewer 1 assignment**: Assignment and qualification verification of Reviewer 2 (different from Reviewer 1, minimum prerequisite #2), adjudicator designation (minimum prerequisite #3), and configuration freeze identifier recording (minimum prerequisite #6).
| 12 | Label rubric and resolution procedure finalized → enables Layer A label quality assessment |
| 13 | Independent human-review sign-off → enables Layer A quality certification |
| 4 | Reviewer availability windows | Scheduling / timeline | Does not explicitly appear in the 9 minimum prerequisites. Role in Layer A/B unclear. May be implicit for scheduling but not called out as blocking any phase. |
| 5 | Blind-labeling protocol confirmation | Procedure | Described in Sections 2-7 but not explicitly listed among the 9 minimum prerequisites. Whether it blocks Layer B directly or only via label quality is not resolved. |
| 6 | Adjudicator disagreement-resolution procedure confirmation | Procedure | Not among the 9 minimum prerequisites. Whether Layer B can proceed with unresolved disputes documented but un-resolved is not specified. |
| 13 | Independent human-review sign-off | Quality certification | Explicitly identified as additional (beyond the 9 minimum). Whether it blocks Layer B directly or only serves as final quality certification is not resolved. |