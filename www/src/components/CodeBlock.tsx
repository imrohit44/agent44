interface CodeBlockProps {
  code: string;
  language?: string;
  label?: string;
}

export default function CodeBlock({
  code,
  language,
  label,
}: CodeBlockProps) {
  return (
    <figure>
      {label && <figcaption className="page-header__eyebrow">{label}</figcaption>}
      <pre className="code-block">
        <code className={language ? `language-${language}` : undefined}>{code}</code>
      </pre>
    </figure>
  );
}
