import PageHeader from "./PageHeader";
import Section from "./Section";

export default function Evaluation() {
  return (
    <div className="legacy-page evaluation-page">
      <section className="legacy-page__intro">
        <div className="site-container">
          <PageHeader
            description="The repository's hand-authored synthetic corpus evaluates individual policy decisions against registered expected outcomes."
            eyebrow="EVALUATION / SYNTHETIC CORPUS"
            title="Measure decisions, not attack outcomes."
          />
        </div>
      </section>

      <Section className="legacy-page__content">
        <header className="legacy-section-heading">
          <p className="legacy-overline">WHAT IS MEASURED</p>
          <h2>Scenario-level decision agreement.</h2>
          <p>
            Scenarios record tool-call inputs, categories, expected decisions,
            and rationale. Results apply only to the evaluated scenarios and
            configuration.
          </p>
        </header>
        <dl className="legacy-metric-list">
          <div>
            <dt>False allow</dt>
            <dd>An expected-DENY scenario observed as allowed.</dd>
          </div>
          <div>
            <dt>False deny</dt>
            <dd>An expected-ALLOW scenario observed as denied.</dd>
          </div>
        </dl>
      </Section>

      <Section className="legacy-page__principles">
        <header className="legacy-section-heading">
          <p className="legacy-overline">LIMITATIONS</p>
          <h2>Interpret results within their scope.</h2>
        </header>
        <ul className="legacy-bullet-list">
          <li>The corpus is synthetic, not observed production traffic.</li>
          <li>
            Decision correctness does not demonstrate end-to-end attack
            prevention or universal production security.
          </li>
          <li>
            Results are not latency, cost, or comprehensive security
            measurements.
          </li>
        </ul>
        <p className="legacy-source-link">
          <a href="https://github.com/imrohit44/Agent44/blob/main/docs/evaluation.md">
            Read evaluation definitions and limitations
          </a>
        </p>
      </Section>
    </div>
  );
}
