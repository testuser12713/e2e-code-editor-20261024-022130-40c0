import type { ReactNode } from 'react';

export function Specimen({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <article className="kit-specimen" data-testid={id}>
      <header className="kit-specimen-head">
        <h3>{title}</h3>
        <p>{description}</p>
      </header>
      <div className="kit-specimen-body">{children}</div>
    </article>
  );
}

export function State({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="kit-state">
      {children}
      <span className="kit-state-label">{label}</span>
    </div>
  );
}
