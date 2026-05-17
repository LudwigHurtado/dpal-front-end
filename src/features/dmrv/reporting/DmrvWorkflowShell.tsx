import React from 'react';
import { DmrvLiveReportPanel } from './DmrvLiveReportPanel';

export type DmrvWorkflowShellProps = {
  projectId: string;
  categorySlug: string;
  typeId: string;
  workflowStep?: string;
  children: React.ReactNode;
};

/** Two-column DMRV workspace: main form + live report panel (large screens). */
export function DmrvWorkflowShell({
  projectId,
  categorySlug,
  typeId,
  workflowStep,
  children,
}: DmrvWorkflowShellProps): React.ReactElement {
  return (
    <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(300px,360px)] lg:gap-6 lg:items-start">
      <div className="min-w-0">{children}</div>
      <aside className="mt-6 lg:sticky lg:top-4 lg:mt-0 lg:self-start">
        <DmrvLiveReportPanel
          projectId={projectId}
          categorySlug={categorySlug}
          typeId={typeId}
          workflowStep={workflowStep}
        />
      </aside>
    </div>
  );
}
