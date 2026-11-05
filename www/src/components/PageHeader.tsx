import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  description?: ReactNode;
  eyebrow?: string;
}

export default function PageHeader({
  title,
  description,
  eyebrow,
}: PageHeaderProps) {
  return (
    <header className="page-header">
      {eyebrow && <p className="page-header__eyebrow">{eyebrow}</p>}
      <h1 className="page-header__title">{title}</h1>
      {description && <div className="page-header__description">{description}</div>}
    </header>
  );
}
