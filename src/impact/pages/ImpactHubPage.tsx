import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useImpactStore } from '../store/useImpactStore';
import { IM_PATHS } from '../routes/paths';
import ProjectCard from '../features/projects/components/ProjectCard';
import VerificationStatusBadge from '../features/verification/components/VerificationStatusBadge';

const ImpactHubPage: React.FC = () => {
  const navigate = useNavigate();
  const { projects, reviews, loading, hydrate } = useImpactStore();

  useEffect(() => {
    hydrate();
  }, []);

  const activeProjects = projects.filter((p) => p.status === 'active' || p.status === 'monitoring');
  const pendingReviews = reviews.filter((r) => r.status === 'submitted' || r.status === 'under_review');
  const needsEvidence  = reviews.filter((r) => r.status === 'needs_evidence');
  const verifiedTotal  = reviews.filter((r) => r.status === 'verified').length;

  if (loading && projects.length === 0) {
    return (
      <div className="im-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
        <span className="im-spinner" />
      </div>
    );
  }

  return (
    <div className="im-page">
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: '#f4f4f5', marginBottom: 4 }}>
          🌍 Impact Registry
        </div>
        <div style={{ fontSize: 13, color: '#71717a' }}>
          Track, verify, and prove environmental outcomes
        </div>
      </div>

      {/* Stats row */}
      <div className="im-grid-3" style={{ marginBottom: '1.5rem' }}>
        <div className="im-stat">
          <div className="im-stat-value">{projects.length}</div>
          <div className="im-stat-label">Total Projects</div>
        </div>
        <div className="im-stat">
          <div className="im-stat-value">{verifiedTotal}</div>
          <div className="im-stat-label">Verified</div>
        </div>
        <div className="im-stat">
          <div className="im-stat-value">{pendingReviews.length}</div>
          <div className="im-stat-label">In Review</div>
        </div>
      </div>

      {/* Needs attention */}
      {needsEvidence.length > 0 && (
        <div
          className="im-card"
          style={{
            marginBottom: '1.5rem',
            borderColor: 'rgba(245,158,11,0.35)',
            background: 'rgba(245,158,11,0.05)',
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 700, color: '#fbbf24', marginBottom: 8 }}>
            ⚠️ {needsEvidence.length} project{needsEvidence.length > 1 ? 's' : ''} need additional evidence
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {needsEvidence.map((r) => (
              <div
                key={r.id}
                style={{ fontSize: 12, color: '#a1a1aa', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}
                onClick={() => navigate(`${IM_PATHS.projects}/${r.projectId}`)}
              >
                <span>{r.projectTitle}</span>
                <span style={{ color: '#52525b' }}>→ {r.notes}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active projects */}
      <div className="im-section-header">
        <div className="im-section-title">Active Projects</div>
        <button className="im-btn im-btn-primary" onClick={() => navigate(IM_PATHS.projectCreate)}>
          + New Project
        </button>
      </div>

      {activeProjects.length === 0 ? (
        <div className="im-empty">
          <div className="im-empty-icon">🌱</div>
          <div className="im-empty-text">No active projects yet. Create your first one.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: '2rem' }}>
          {activeProjects.slice(0, 4).map((p) => (
            <ProjectCard
              key={p.id}
              project={p}
              onClick={() => navigate(IM_PATHS.projectDetail(p.id))}
            />
          ))}
          {activeProjects.length > 4 && (
            <button className="im-btn im-btn-ghost" onClick={() => navigate(IM_PATHS.projects)}>
              View all {activeProjects.length} active projects →
            </button>
          )}
        </div>
      )}

      {/* Verification queue snapshot */}
      <div className="im-section-header" style={{ marginTop: '1.5rem' }}>
        <div className="im-section-title">Verification Queue</div>
        <button className="im-btn im-btn-ghost" onClick={() => navigate(IM_PATHS.verification)}>
          View all
        </button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {reviews.slice(0, 4).map((r) => (
          <div
            key={r.id}
            className="im-card"
            style={{ cursor: 'pointer' }}
            onClick={() => navigate(IM_PATHS.verification)}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#e4e4e7' }}>{r.projectTitle}</div>
              <VerificationStatusBadge status={r.status} />
            </div>
            {r.notes && (
              <div style={{ fontSize: 11, color: '#71717a', marginTop: 4 }}>{r.notes}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ImpactHubPage;
