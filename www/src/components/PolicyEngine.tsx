import { useState } from "react";
import PageHeader from "./PageHeader";

type ScenarioId = "explicit-allow" | "argument-rule" | "default";
type Action = "ALLOW" | "DENY";

interface WalkthroughDecision {
  action: Action;
  reason: string;
  ruleId: string;
}

const policySource =
  "https://github.com/imrohit44/agent44/blob/main/src/agent44/policy.py";
const testsSource =
  "https://github.com/imrohit44/agent44/blob/main/tests/test_policy.py";
const demoSource =
  "https://github.com/imrohit44/agent44/blob/main/evaluation/demo.yaml";

function isScenarioId(value: string): value is ScenarioId {
  return (
    value === "explicit-allow" ||
    value === "argument-rule" ||
    value === "default"
  );
}

export default function PolicyEngine() {
  const [scenarioId, setScenarioId] = useState<ScenarioId>("argument-rule");
  const [evalFieldPresent, setEvalFieldPresent] = useState(true);
  const [defaultDeny, setDefaultDeny] = useState(true);

  let toolName: string;
  let argumentsText: string;
  let policyText: string;
  let decision: WalkthroughDecision;
  let scenarioTitle: string;

  if (scenarioId === "explicit-allow") {
    toolName = "add";
    argumentsText = '{ "a": 2, "b": 3 }';
    policyText = `version: "1"
name: policy-lab-example
default_deny: true
allow_tools: [add]`;
    decision = {
      action: "ALLOW",
      reason: "tool 'add' is allowed by policy",
      ruleId: "allow_tools",
    };
    scenarioTitle = "Explicit tool allow";
  } else if (scenarioId === "argument-rule") {
    toolName = "echo";
    argumentsText = evalFieldPresent
      ? '{ "message": "hello", "eval": true }'
      : '{ "message": "hello" }';
    policyText = `version: "1"
name: demo-policy
default_deny: true
allow_tools: [add, echo]
rules:
  - id: deny-eval-flag
    tool: echo
    action: DENY
    reason: "argument 'eval' is not permitted on echo"
    when:
      field: eval
      field_exists: true`;
    decision = evalFieldPresent
      ? {
          action: "DENY",
          reason: "argument 'eval' is not permitted on echo",
          ruleId: "deny-eval-flag",
        }
      : {
          action: "ALLOW",
          reason: "tool 'echo' is allowed by policy",
          ruleId: "allow_tools",
        };
    scenarioTitle = "Argument rule before allow";
  } else {
    toolName = "unlisted_tool";
    argumentsText = "{}";
    policyText = `version: "1"
name: policy-lab-default
default_deny: ${defaultDeny}`;
    decision = defaultDeny
      ? {
          action: "DENY",
          reason: "no rule matched and default_deny is enabled",
          ruleId: "default_deny",
        }
      : {
          action: "ALLOW",
          reason: "no rule matched and default_deny is disabled",
          ruleId: "default_allow",
        };
    scenarioTitle = "Unmatched tool and default";
  }

  const allowed = decision.action === "ALLOW";

  return (
    <div className="policy-lab-page">
      <header className="policy-lab-intro">
        <div className="site-container">
          <PageHeader
            description="Explore a small set of source-backed policy outcomes. These guided examples explain selected Python behavior; they do not execute the policy engine or call an MCP tool."
            eyebrow="POLICY LAB / GUIDED WALKTHROUGH"
            title="See how a policy decision is reached."
          />
          <div className="policy-lab-notice" role="note">
            <strong>Illustrative walkthrough — not a live simulator.</strong>
            <span>
              The page selects authored outcomes from repository examples. It
              does not parse this configuration, run Python policy code, connect
              to a proxy, or invoke a downstream tool.
            </span>
          </div>
        </div>
      </header>

      <section aria-labelledby="workspace-title" className="policy-lab-section">
        <div className="site-container">
          <div className="policy-lab-section-heading">
            <p className="policy-lab-overline">01 / DECISION WORKSPACE</p>
            <h2 id="workspace-title">Choose a verified example</h2>
            <p>
              Switch between fixed request examples and supported policy
              settings. Each result corresponds to a specific documented
              behavior, not an arbitrary policy evaluation.
            </p>
          </div>

          <div className="policy-lab-workspace">
            <section aria-labelledby="request-title" className="policy-lab-panel">
              <div className="policy-lab-panel-heading">
                <p className="policy-lab-overline">REQUEST</p>
                <h3 id="request-title">Example MCP tool call</h3>
              </div>
              <label className="policy-lab-field">
                <span>Walkthrough example</span>
                <select
                  onChange={(event) => {
                    if (isScenarioId(event.currentTarget.value)) {
                      setScenarioId(event.currentTarget.value);
                    }
                  }}
                  value={scenarioId}
                >
                  <option value="explicit-allow">Explicit tool allow</option>
                  <option value="argument-rule">Argument rule before allow</option>
                  <option value="default">Unmatched tool and default</option>
                </select>
              </label>

              {scenarioId === "argument-rule" && (
                <label className="policy-lab-checkbox">
                  <input
                    checked={evalFieldPresent}
                    onChange={(event) => setEvalFieldPresent(event.target.checked)}
                    type="checkbox"
                  />
                  <span>
                    Include the <code>eval</code> argument
                  </span>
                </label>
              )}

              <dl className="policy-lab-request-details">
                <div>
                  <dt>Tool</dt>
                  <dd>
                    <code>{toolName}</code>
                  </dd>
                </div>
                <div>
                  <dt>Arguments</dt>
                  <dd>
                    <pre>
                      <code>{argumentsText}</code>
                    </pre>
                  </dd>
                </div>
              </dl>
            </section>

            <section
              aria-labelledby="configuration-title"
              className="policy-lab-panel"
            >
              <div className="policy-lab-panel-heading">
                <p className="policy-lab-overline">POLICY INPUT</p>
                <h3 id="configuration-title">Relevant configuration</h3>
              </div>
              {scenarioId === "default" && (
                <label className="policy-lab-checkbox policy-lab-checkbox--setting">
                  <input
                    checked={defaultDeny}
                    onChange={(event) => setDefaultDeny(event.target.checked)}
                    type="checkbox"
                  />
                  <span>
                    <code>default_deny: {String(defaultDeny)}</code>
                    <small>
                      Turn off to show the supported allow-on-default behavior.
                    </small>
                  </span>
                </label>
              )}
              {scenarioId !== "default" && (
                <p className="policy-lab-static-note">
                  This example uses a fixed configuration excerpt. Select the
                  default example to change <code>default_deny</code>.
                </p>
              )}
              <pre className="policy-lab-code">
                <code>{policyText}</code>
              </pre>
              <p className="policy-lab-config-note">
                Excerpt of a supported version 1 policy. It is displayed for
                explanation only and is not loaded by Agent44 here.
              </p>
            </section>
          </div>
        </div>
      </section>

      <section aria-labelledby="result-title" className="policy-lab-section">
        <div className="site-container">
          <div className="policy-lab-section-heading">
            <p className="policy-lab-overline">02 / SELECTED OUTCOME</p>
            <h2 id="result-title">What this example demonstrates</h2>
          </div>

          <div
            aria-atomic="true"
            aria-live="polite"
            className={`policy-lab-result ${
              allowed ? "policy-lab-result--allow" : "policy-lab-result--deny"
            }`}
            role="status"
          >
            <div className="policy-lab-result__summary">
              <p className="policy-lab-overline">{scenarioTitle}</p>
              <p className="policy-lab-action">{decision.action}</p>
              <p className="policy-lab-result__status">
                {allowed
                  ? "This call would proceed to the downstream MCP server."
                  : "The proxy would block this call before downstream execution."}
              </p>
            </div>
            <dl className="policy-lab-result__details">
              <div>
                <dt>Matched rule</dt>
                <dd>
                  <code>{decision.ruleId}</code>
                </dd>
              </div>
              <div>
                <dt>Reason</dt>
                <dd>{decision.reason}</dd>
              </div>
            </dl>
          </div>
          <p className="policy-lab-result-caveat">
            “Would proceed” describes the selected example’s policy outcome
            only. No tool call is made, and an ALLOW decision does not establish
            that a request is universally safe.
          </p>
        </div>
      </section>

      <section aria-labelledby="lifecycle-title" className="policy-lab-section">
        <div className="site-container">
          <div className="policy-lab-section-heading">
            <p className="policy-lab-overline">03 / REQUEST LIFECYCLE</p>
            <h2 id="lifecycle-title">Where the decision sits</h2>
            <p>
              With policy enabled, the proxy evaluates eligible tool calls
              before forwarding. Tool discovery is forwarded separately.
            </p>
          </div>

          <ol
            aria-label={`Illustrated request path; selected outcome is ${decision.action}`}
            className={`policy-lab-flow ${
              allowed ? "policy-lab-flow--allow" : "policy-lab-flow--deny"
            }`}
          >
            <li className="policy-lab-flow__node policy-lab-flow__node--active">
              <span>01</span>
              <strong>Agent</strong>
            </li>
            <li className="policy-lab-flow__node policy-lab-flow__node--active">
              <span>02</span>
              <strong>MCP Client</strong>
            </li>
            <li className="policy-lab-flow__node policy-lab-flow__node--active">
              <span>03</span>
              <strong>Agent44 Proxy</strong>
            </li>
            <li className="policy-lab-flow__node policy-lab-flow__node--active policy-lab-flow__node--decision">
              <span>04</span>
              <strong>Policy evaluation</strong>
              <em>{decision.action}</em>
            </li>
            <li
              className={`policy-lab-flow__node ${
                allowed
                  ? "policy-lab-flow__node--active"
                  : "policy-lab-flow__node--blocked"
              }`}
            >
              <span>05</span>
              <strong>Downstream MCP tool</strong>
              <em>{allowed ? "Would be called" : "Blocked"}</em>
            </li>
          </ol>
          <p className="policy-lab-flow-description">
            {allowed
              ? "In this allow example, the proxy would forward the tool call after the decision."
              : "In this deny example, the proxy returns a tool-level error without invoking the downstream tool."}
          </p>
        </div>
      </section>

      <section aria-labelledby="scope-title" className="policy-lab-section">
        <div className="site-container policy-lab-scope">
          <div>
            <p className="policy-lab-overline">SCOPE & SOURCES</p>
            <h2 id="scope-title">A walkthrough, not the whole engine</h2>
            <p>
              Agent44’s Python engine also has hard-deny, argument-constraint,
              delegation, provenance, ordered rule, adapter, and failure
              handling tiers. They are intentionally not simulated here. The
              controls cover only the shown tool-list, argument-rule, and
              default examples.
            </p>
            <p>
              Policy applies to eligible tool calls when enabled. Tool
              discovery is forwarded; provenance metadata transport alone does
              not validate provenance or authorize a call. A policy decision
              is not comprehensive attack prevention.
            </p>
          </div>
          <nav aria-label="Policy Lab source files" className="policy-lab-sources">
            <a href={policySource} rel="noreferrer" target="_blank">
              Python policy implementation
            </a>
            <a href={testsSource} rel="noreferrer" target="_blank">
              Policy behavior tests
            </a>
            <a href={demoSource} rel="noreferrer" target="_blank">
              Demo policy configuration
            </a>
          </nav>
        </div>
      </section>
    </div>
  );
}
