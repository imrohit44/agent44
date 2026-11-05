import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import SiteLayout from "./components/SiteLayout";
import Hero from "./components/Hero";
import Problem from "./components/Problem";
import Architecture from "./components/Architecture";
import PolicyEngine from "./components/PolicyEngine";
import Provenance from "./components/Provenance";
import Evaluation from "./components/Evaluation";
import Developer from "./components/Developer";
import Documentation from "./components/Documentation";
import Releases from "./components/Releases";
import NotFound from "./components/NotFound";

export default function App() {
  return (
    <Router>
      <SiteLayout>
        <Routes>
          <Route path="/" element={<Hero />} />
          <Route path="problem" element={<Problem />} />
          <Route path="architecture" element={<Architecture />} />
          <Route path="policy" element={<PolicyEngine />} />
          <Route path="policy-lab" element={<PolicyEngine />} />
          <Route path="provenance" element={<Provenance />} />
          <Route path="evaluation" element={<Evaluation />} />
          <Route path="github" element={<Developer />} />
          <Route path="docs" element={<Documentation />} />
          <Route path="releases" element={<Releases />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </SiteLayout>
    </Router>
  );
}