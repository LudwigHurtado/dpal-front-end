import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useImpactStore } from '../store/useImpactStore';
import { IM_PATHS } from '../routes/paths';
import ProjectCard from '../features/projects/components/ProjectCard';
import type { ProjectStatus } from '../types/project';

const ALL_STATUSES: Array<ProjectStatus | 'all'> = ['all', 'draft', 'active', 'monitoring', 'verified', 'completed'];

const ProjectsListPage: React.FC = () => {
  const navigate = useNavigate();
  const { projects, loading, hydrate } = useImpactStore();
  const [filterStatus, setFilterStatus] = useState<ProjectStatus | 'all'>('all');
  const [filterType, setFilterType] = useState<ProjectType | 'all'>('all');

  useEffect(() => {
    if (projects.length === 0) hydrate();
  }, []);

  const filtered = projects.filter((p) => {
    if (filterStatus !== 'all' && p.status !== filterStatus) return false;
    if (filterType !== 'all' && p.type !== filterType) return false;
    return true;
  });

  return (
    <div className="im-page">
      <div className="im-section-header">
        <div>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#f4f4f5' }}>Projects</div>
          <div style={{ fontSize: 12, color: '#71717a' }}>{filtered.length} of {projects.length} projects</div>
        </div>
        <button className="im-btn im-btn-primary" onClick={() => navigate(IM_PATHS.projectCreate)}>
          + New Project
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        {ALL_STATUSES.map((s) => (
          <button
            key={s}
            className={`im-btn ${filterStatus === s ? 'im-btn-primary' : 'im-btn-ghost'}`}
            style={{ padding: '5px 12px', fontSize: 12 }}
            onClick={() => setFilterStatus(s)}
          >
            {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {loading && projects.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}><span className="im-spinner" /></div>
      ) : filtered.length === 0 ? (
        <div className="im-empty">
          <div className="im-empty-icon">🌱</div>
          <div className="im-empty-text">No projects match your filters.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map((p) => (
            <ProjectCard
              key={p.id}
              project={p}
              onClick={() => navigate(IM_PATHS.projectDetail(p.id))}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default ProjectsListPage;
