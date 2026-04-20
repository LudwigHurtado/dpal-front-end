import React from 'react';
import type { ProjectStatus } from '../../../types/project';

const STATUS_CONFIG: Record<ProjectStatus, { label: string; cls: string }> = {
  draft:      { label: 'Draft',      cls: 'im-badge-zinc'   },
  active:     { label: 'Active',     cls: 'im-badge-green'  },
  monitoring: { label: 'Monitoring', cls: 'im-badge-blue'   },
  verified:   { label: 'Verified',   cls: 'im-badge-teal'   },
  completed:  { label: 'Completed',  cls: 'im-badge-amber'  },
  archived:   { label: 'Archived',   cls: 'im-badge-zinc'   },
};

const ProjectStatusBadge: React.FC<{ status: ProjectStatus }> = ({ status }) => {
  const { label, cls } = STATUS_CONFIG[status] ?? STATUS_CONFIG.draft;
  return <span className={`im-badge ${cls}`}>{label}</span>;
};

export default ProjectStatusBadge;
