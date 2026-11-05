import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { getCanonicalUrl, getSitePage } from "../siteMetadata";

const socialImagePath = "/agent44-social.svg";

function setMeta(attribute: "name" | "property", key: string, content: string) {
  let meta = document.head.querySelector<HTMLMetaElement>(
    `meta[${attribute}="${key}"]`,
  );
  if (!meta) {
    meta = document.createElement("meta");
    meta.setAttribute(attribute, key);
    document.head.append(meta);
  }
  meta.content = content;
}

export default function PageMetadata() {
  const { pathname } = useLocation();

  useEffect(() => {
    const page = getSitePage(pathname);
    const siteOrigin =
      import.meta.env.AGENT44_SITE_ORIGIN ?? window.location.origin;
    const title = page?.title ?? "Page not found — Agent44";
    const description =
      page?.description ??
      "The requested Agent44 page could not be found. Return to the homepage or use the site navigation.";
    const canonical = page
      ? getCanonicalUrl(pathname, siteOrigin)
      : undefined;
    const image = new URL(
      socialImagePath,
      `${siteOrigin}/`,
    ).toString();

    document.title = title;

    const canonicalLink =
      document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (canonical) {
      const link = canonicalLink ?? document.createElement("link");
      link.rel = "canonical";
      link.href = canonical;
      if (!canonicalLink) {
        document.head.append(link);
      }
    } else {
      canonicalLink?.remove();
    }

    setMeta("name", "description", description);
    setMeta("property", "og:title", title);
    setMeta("property", "og:description", description);
    setMeta("property", "og:type", "website");
    if (canonical) {
      setMeta("property", "og:url", canonical);
    } else {
      document.head
        .querySelector<HTMLMetaElement>('meta[property="og:url"]')
        ?.remove();
    }
    setMeta("property", "og:image", image);
    setMeta("property", "og:image:type", "image/svg+xml");
    setMeta("name", "twitter:card", "summary_large_image");
    setMeta("name", "twitter:title", title);
    setMeta("name", "twitter:description", description);
    setMeta("name", "twitter:image", image);
  }, [pathname]);

  return null;
}
