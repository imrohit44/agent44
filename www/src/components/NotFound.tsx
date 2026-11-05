import { Link } from "react-router-dom";
import PageHeader from "./PageHeader";

export default function NotFound() {
  return (
    <section className="not-found-page">
      <div className="site-container">
        <PageHeader
          description="The URL may be incorrect, or the page may have moved."
          eyebrow="404 / PAGE NOT FOUND"
          title="This route does not exist."
        />
        <Link className="not-found-page__link" to="/">
          Return to Agent44 home
        </Link>
      </div>
    </section>
  );
}