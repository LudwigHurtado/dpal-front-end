import React from 'react';

export interface WorkspaceToolCardProps {
  title: string;
  description: string;
  badge?: string;
  onClick?: () => void;
  href?: string;
  footer?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}

/** Rounded dashboard card linking into an engine or route. */
export function WorkspaceToolCard({
  title,
  description,
  badge,
  onClick,
  href,
  footer,
  icon,
  className = '',
}: WorkspaceToolCardProps): React.ReactElement {
  const inner = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          {icon ? (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
              {icon}
            </div>
          ) : null}
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">{description}</p>
          </div>
        </div>
        {badge ? (
          <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-800 ring-1 ring-emerald-100">
            {badge}
          </span>
        ) : null}
      </div>
      {footer ? <div className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-500">{footer}</div> : null}
    </>
  );

  const cardClass = `rounded-2xl border border-slate-200/90 bg-white p-5 text-left shadow-sm shadow-slate-900/5 transition hover:border-slate-300 hover:shadow-md ${className}`;

  if (href) {
    return (
      <a href={href} className={`block ${cardClass}`}>
        {inner}
      </a>
    );
  }

  return (
    <button type="button" onClick={onClick} className={`w-full ${cardClass}`}>
      {inner}
    </button>
  );
}
