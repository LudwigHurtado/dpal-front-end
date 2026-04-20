import React from 'react';
import type { ImpactProject } from '../../../types/project';
import { PROJECT_TYPE_ICONS, PROJECT_TYPE_LABELS } from '../../../types/project';
import ProjectStatusBadge from './ProjectStatusBadge';

interface Props {
  project: ImpactProject;
  onClick?: () => void;
}

const ProjectCard: React.FC<Props> = ({ project, onClick }) => (
  <div
    className="im-card"
    style={{ cursor: onClick ? 'pointer' : 'default' }}
    onClick={onClick}
    role={onClick ? 'button' : undefined}
    tabIndex={onClick ? 0 : undefined}
    onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
  >
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 20 }}>{PROJECT_TYPE_ICONS[project.type]}</span>
        <div>
          <div className="im-card-title" style={{ marginBottom: 2 }}>{project.title}</div>
          <div className="im-card-meta">{PROJECT_TYPE_LABELS[project.type]} · {project.location.country}</div>
        </div>
      </div>
      <ProjectStatusBadge status={project.status} />
    </div>

    <p style={{ fontSize: 12, color: '#a1a1aa', margin: '0 0 10px', lineHeight: 1.5 }}>
      {project.baselineSummary}
    </p>

    <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#71717a' }}>
      <span>📷 {project.evidenceCount}</span>
      <span>📡 {project.monitoringCheckCount} checks</span>
      <span>🏷️ {project.claimsCount} claims</span>
      {project.areaHectares && <span>📐 {project.areaHectares.toLocaleString()} ha</span>}
    </div>

    {project.tags.length > 0 && (
      <div style={{ marginTop: 10, display: 'flex', gap: 5, flexWrap: 'wrap' }}>
        {project.tags.map((t) => (
          <span key={t} className="im-tag">{t}</span>
        ))}
      </div>
    )}
  </div>
);

export default ProjectCard;
