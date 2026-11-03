import React from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import Nav from "./components/Nav";
import Hero from "./components/Hero";
import Problem from "./components/Problem";
import Architecture from "./components/Architecture";
import PolicyEngine from "./components/PolicyEngine";
import Provenance from "./components/Provenance";
import Evaluation from "./components/Evaluation";
import EngineeringJourney from "./components/EngineeringJourney";
import Developer from "./components/Developer";
import NotFound from "./components/NotFound";

const routes = () => (
  <Router>
    <Nav />
    <Routes>
      <Route path="/" element={<Hero />} />
      <Route path="problem" element={<Problem />} />
      <Route path="architecture" element={<Architecture />} />
      <Route path="policy" element={<PolicyEngine />} />
      <Route path="provenance" element={<Provenance />} />
      <Route path="evaluation" element={<Evaluation />} />
      <Route path="github" element={<Developer />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  </Router>
);

export default function App() {
  return <routes />;
}