import { writeFile, mkdir, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";
import tailwindcss from "tailwindcss";
import autoprefixer from "autoprefixer";
import { SITE_PAGES } from "./src/siteMetadata";

const configDirectory = dirname(fileURLToPath(import.meta.url));

function getSiteOrigin(): string {
  const configuredOrigin =
    process.env.VITE_SITE_URL ?? process.env.VERCEL_PROJECT_PRODUCTION_URL;

  if (!configuredOrigin) {
    if (process.env.VERCEL === "1") {
      throw new Error(
        "Vercel builds require VERCEL_PROJECT_PRODUCTION_URL or VITE_SITE_URL to generate canonical metadata.",
      );
    }
    return "http://localhost:5173";
  }

  const url = new URL(
    configuredOrigin.includes("://")
      ? configuredOrigin
      : `https://${configuredOrigin}`,
  );
  if (url.protocol !== "https:" && process.env.VERCEL === "1") {
    throw new Error("The production site origin must use HTTPS.");
  }
  return url.origin;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character];
  });
}

function routeMetadataPlugin(siteOrigin: string): Plugin {
  const outputDirectory = resolve(configDirectory, "dist");
  const socialImage = `${siteOrigin}/agent44-social.svg`;

  function renderHtml(
    template: string,
    title: string,
    description: string,
    canonical?: string,
  ): string {
    let html = template
      .replaceAll("__AGENT44_TITLE__", escapeHtml(title))
      .replaceAll("__AGENT44_DESCRIPTION__", escapeHtml(description))
      .replaceAll("__AGENT44_SOCIAL_IMAGE__", escapeHtml(socialImage));

    if (canonical) {
      html = html.replaceAll("__AGENT44_CANONICAL__", escapeHtml(canonical));
    } else {
      html = html
        .replace(/<link rel="canonical" href="__AGENT44_CANONICAL__"\s*\/?>/, "")
        .replace(/<meta property="og:url" content="__AGENT44_CANONICAL__"\s*\/?>/, "");
    }
    return html;
  }

  return {
    name: "agent44-route-metadata",
    apply: "build",
    async closeBundle() {
      const template = await readFile(resolve(outputDirectory, "index.html"), "utf8");
      const canonicalPages = SITE_PAGES.filter((page) => !page.canonicalPath);

      for (const page of SITE_PAGES) {
        const canonicalPath = page.canonicalPath ?? page.path;
        const canonical = `${siteOrigin}${canonicalPath}`;
        const route = page.path === "/" ? "" : page.path.slice(1);
        const destination = route
          ? resolve(outputDirectory, route, "index.html")
          : resolve(outputDirectory, "index.html");

        if (route) {
          await mkdir(dirname(destination), { recursive: true });
        }
        await writeFile(
          destination,
          renderHtml(template, page.title, page.description, canonical),
          "utf8",
        );
      }

      const notFoundHtml = renderHtml(
        template,
        "Page not found — Agent44",
        "The requested Agent44 page could not be found. Return to the homepage or use the site navigation.",
      );
      await writeFile(resolve(outputDirectory, "404.html"), notFoundHtml, "utf8");

      const sitemap = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
        ...canonicalPages.map(
          (page) => `<url><loc>${escapeHtml(`${siteOrigin}${page.path}`)}</loc></url>`,
        ),
        "</urlset>",
      ].join("");
      await writeFile(resolve(outputDirectory, "sitemap.xml"), sitemap, "utf8");
      await writeFile(
        resolve(outputDirectory, "robots.txt"),
        `User-agent: *\nAllow: /\nSitemap: ${siteOrigin}/sitemap.xml\n`,
        "utf8",
      );
    },
  };
}

const siteOrigin = getSiteOrigin();

export default defineConfig({
  define: {
    "import.meta.env.AGENT44_SITE_ORIGIN": JSON.stringify(siteOrigin),
  },
  plugins: [react(), routeMetadataPlugin(siteOrigin)],
  css: {
    postcss: {
      plugins: [tailwindcss(), autoprefixer()],
    },
  },
});