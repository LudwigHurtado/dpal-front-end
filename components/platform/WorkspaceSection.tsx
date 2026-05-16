import React from 'react';

export interface WorkspaceSectionProps {
  id?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

/** Section header + body for workspace pages. */
export function WorkspaceSection({
  id,
  title,
  description,
  action,
  children,
  className = '',
}: WorkspaceSectionProps): React.ReactElement {
  return (
    <section id={id} className={`scroll-mt-24 ${className}`}>
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-slate-900">{title}</h2>
          {description ? <p className="mt-1 max-w-2xl text-sm text-slate-600">{description}</p> : null}
        </div>
        {action ? <div className="flex shrink-0 flex-wrap gap-2">{action}</div> : null}
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}
