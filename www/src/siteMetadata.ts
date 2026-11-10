export interface SitePage {
  path: string;
  title: string;
  description: string;
  canonicalPath?: string;
}

export const SITE_PAGES: SitePage[] = [
  {
    path: "/",
    title: "Agent44 — A decision layer for MCP tool calls",
    description:
      "Agent44 is an open-source MCP proxy and policy engine for evaluating eligible tool calls before downstream execution.",
  },
  {
    path: "/problem",
    title: "The problem — Agent44",
    description:
      "Explore the gap between an AI agent requesting a tool and a downstream server executing it, and where an explicit policy decision can fit.",
  },
  {
    path: "/architecture",
    title: "Architecture — Agent44",
    description:
      "Follow MCP client connections, forwarded tool discovery, policy evaluation, and downstream execution through Agent44.",
  },
  {
    path: "/policy",
    title: "Policy Lab — Agent44",
    description:
      "Explore fixed, source-backed examples of Agent44 policy decisions. The browser walkthrough is illustrative and does not execute tools.",
    canonicalPath: "/policy-lab",
  },
  {
    path: "/policy-lab",
    title: "Policy Lab — Agent44",
    description:
      "Explore fixed, source-backed examples of Agent44 policy decisions. The browser walkthrough is illustrative and does not execute tools.",
  },
  {
    path: "/provenance",
    title: "Provenance — Agent44",
    description:
      "Learn about Agent44 provenance trust classes and the boundary between metadata transport and validation.",
  },
  {
    path: "/evaluation",
    title: "Evaluation — Agent44",
    description:
      "Understand Agent44's synthetic per-call policy evaluation corpus, decision metrics, and limitations.",
  },
  {
    path: "/github",
    title: "Developer resources — Agent44",
    description:
      "Find setup information for the Agent44 Python proxy and its published TypeScript MCP client.",
  },
  {
    path: "/docs",
    title: "Documentation — Agent44",
    description:
      "Install and use the Agent44 TypeScript MCP client, configure its child process, and understand its API and boundaries.",
  },
  {
    path: "/releases",
    title: "Releases — Agent44",
    description:
      "Release details for the published @imrohit44/agent44-ts-client package, including the current v0.3.0 SDK.",
  },
  {
    path: "/engineering",
    title: "Engineering — Agent44",
    description:
      "Review Agent44's engineering evidence, synthetic policy evaluation, implementation decisions, and security boundaries.",
  },
  {
    path: "/journey",
    title: "Project Journey — Agent44",
    description:
      "Explore source-linked Agent44 milestones from its Python proxy foundation through the TypeScript client release.",
  },
];

export function getSitePage(pathname: string): SitePage | undefined {
  const normalizedPath =
    pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  return SITE_PAGES.find((page) => page.path === normalizedPath);
}

export function getCanonicalUrl(pathname: string, siteOrigin: string): string {
  const page = getSitePage(pathname);
  const canonicalPath = page?.canonicalPath ?? page?.path ?? pathname;
  return new URL(canonicalPath, `${siteOrigin}/`).toString();
}
