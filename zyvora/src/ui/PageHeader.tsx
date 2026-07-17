/**
 * Page header — the predictable top of every view (commerce-admin pattern):
 * title + short supporting description on the left, primary and secondary
 * actions on the right. Creation forms live behind the primary action, so
 * indexes lead with the records, not the form.
 */
import type { ReactNode } from "react";

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="page-head">
      <div className="titling">
        <h1>{title}</h1>
        {description && <p className="subtitle">{description}</p>}
      </div>
      {actions && <div className="head-actions">{actions}</div>}
    </header>
  );
}
