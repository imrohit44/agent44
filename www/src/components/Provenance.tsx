import PageHeader from "./PageHeader";
import Section from "./Section";

const trustClasses = [
  {
    name: "TRUSTED",
    description:
      "A value registered at an explicit trusted boundary or promoted through an authorized validation transition.",
  },
  {
    name: "UNTRUSTED",
    description: "External input or a value whose reference is unknown.",
  },
  {
    name: "DERIVED_UNTRUSTED",
    description:
      "A derived value with missing, unknown, or untrusted lineage.",
  },
];

export default function Provenance() {
  return (
    <div className="legacy-page provenance-page">
      <section className="legacy-page__intro">
        <div className="site-container">
          <PageHeader
            description="The Python provenance implementation tracks value trust and lineage within its registry. This is distinct from the TypeScript client's metadata transport."
            eyebrow="PROVENANCE / PYTHON IMPLEMENTATION"
            title="Track trust without trusting a reference by itself."
          />
        </div>
      </section>

      <Section className="legacy-page__content">
        <header className="legacy-section-heading">
          <p className="legacy-overline">TRUST CLASSIFICATIONS</p>
          <h2>Trust depends on recorded lineage.</h2>
        </header>
        <dl className="legacy-trust-list">
          {trustClasses.map((item) => (
            <div key={item.name}>
              <dt>{item.name}</dt>
              <dd>{item.description}</dd>
            </div>
          ))}
        </dl>
      </Section>

      <Section className="legacy-page__principles">
        <header className="legacy-section-heading">
          <p className="legacy-overline">BOUNDARIES</p>
          <h2>Transport does not establish trust.</h2>
        </header>
        <ul className="legacy-bullet-list">
          <li>Caller-supplied argument fields do not establish trust.</li>
          <li>A well-formed but unknown reference does not become trusted.</li>
          <li>
            The TypeScript client can carry{" "}
            <code>_meta.provenanceReference</code> as MCP metadata.
          </li>
          <li>
            Metadata transport is not registry validation or authorization.
          </li>
        </ul>
        <p className="legacy-source-link">
          <a href="https://github.com/imrohit44/Agent44/blob/main/docs/provenance.md">
            Read the provenance implementation guide
          </a>
        </p>
      </Section>
    </div>
  );
}
