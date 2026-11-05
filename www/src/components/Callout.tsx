import type { ReactNode } from "react";

type CalloutTone = "info" | "warning" | "denial";

interface CalloutProps {
  children: ReactNode;
  title?: string;
  tone?: CalloutTone;
}

export default function Callout({
  children,
  title,
  tone = "info",
}: CalloutProps) {
  const toneClass = tone === "info" ? "" : ` callout--${tone}`;

  return (
    <aside className={`callout${toneClass}`} aria-label={title}>
      {title && <h2 className="callout__title">{title}</h2>}
      <div>{children}</div>
    </aside>
  );
}
