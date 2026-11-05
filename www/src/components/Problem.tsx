import PageHeader from "./PageHeader";
import Section from "./Section";

const considerations = [
  {
    title: "Policy is optional at the proxy boundary.",
    description:
      "Without a configured policy, the proxy forwards tool calls. When enabled, it evaluates eligible tools/call requests before forwarding.",
  },
  {
    title: "Decision order should be explicit.",
    description:
      "Deterministic policy tiers resolve calls before an optional adapter is considered for configured, eligible tools.",
  },
  {
    title: "An allow is scoped permission.",
    description:
      "ALLOW means the configured policy permits this call to proceed. It does not certify that the request is safe or that every unsafe action will be recognized.",
  },
];

export default function Problem() {
  return (
    <div className="legacy-page problem-page">
      <section className="legacy-page__intro">
        <div className="site-container">
          <PageHeader
            description="An MCP client can request a tool call and a downstream server can execute it. Agent44 explores an explicit policy decision point between those steps."
            eyebrow="THE PROBLEM / TOOL EXECUTION"
            title="A tool request needs a decision boundary."
          />
        </div>
      </section>

      <Section className="legacy-page__content">
        <header className="legacy-section-heading">
          <p className="legacy-overline">THE ENGINEERING QUESTION</p>
          <h2>What happens between request and execution?</h2>
          <p>
            MCP provides the client/server interaction. It does not define the
            application-specific policy an operator may want to apply before a
            tool call is sent downstream.
          </p>
        </header>
        <ol className="legacy-principles">
          {considerations.map((item, index) => (
            <li key={item.title}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <div>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </div>
            </li>
          ))}
        </ol>
      </Section>
    </div>
  );
}
