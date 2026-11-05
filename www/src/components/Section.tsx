import type { ReactNode } from "react";

interface SectionProps {
  children: ReactNode;
  className?: string;
  id?: string;
  readingWidth?: boolean;
}

export default function Section({
  children,
  className = "",
  id,
  readingWidth = false,
}: SectionProps) {
  const innerClass = readingWidth
    ? "content-section__inner content-section__inner--reading"
    : "content-section__inner";

  return (
    <section className={`content-section ${className}`.trim()} id={id}>
      <div className={innerClass}>{children}</div>
    </section>
  );
}
