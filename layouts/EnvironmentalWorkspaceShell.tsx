import React from 'react';

/** Wrapper for environmental monitoring & remote sensing workspaces. */
export default function EnvironmentalWorkspaceShell({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}): React.ReactElement {
  return (
    <div className={`rounded-2xl border border-slate-200/90 bg-white shadow-sm shadow-slate-900/5 ${className}`}>
      <div className="border-b border-slate-100 px-6 py-4">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-sky-800">Environmental Workspace</p>
      </div>
      <div className="px-6 py-6">{children}</div>
    </div>
  );
}
