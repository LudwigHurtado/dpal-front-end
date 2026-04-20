import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useImpactStore } from '../store/useImpactStore';
import { IM_PATHS } from '../routes/paths';
import ProjectStatusBadge from '../features/projects/components/ProjectStatusBadge';
import EvidenceCard from '../features/evidence/components/EvidenceCard';
import VerificationStatusBadge from '../features/verification/components/VerificationStatusBadge';
import ClaimTypeTag from '../features/claims/components/ClaimTypeTag';
import { PROJECT_TYPE_ICONS, PROJECT_TYPE_LABELS } from '../types/project';

type Tab = 'overview' | 'evidence' | 'monitoring' | 'claims';

const ProjectDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    projects, evidence, checks, claims, reviews,
    loadEvidenceForProject, loadChecksForProject, loadClaimsForProject,
  } = useImpactStore();
  const [tab, setTab] = useState<Tab>('overview');

  const project = projects.find((p) => p.id === id);
  const projectEvidence = evidence.filter((e) => e.projectId === id);
  const projectChecks   = checks.filter((c) => c.projectId === id);
  const projectClaims   = claims.filter((c) => c.projectId === id);
  const review          = reviews.find((r) => r.projectId === id);

  useEffect(() => {
    if (!id) return;
    loadEvidenceForProject(id);
    loadChecksForProject(id);
    loadClaimsForProject(id);
  }, [id]);

  if (!project) {
    return (
      <div className="im-page">
        <button className="im-btn im-btn-ghost" onClick={() => navigate(IM_PATHS.projects)}>← Projects</button>
        <div className="im-empty" style={{ marginTop: '2rem' }}>
          <div className="im-empty-icon">❓</div>
          <div className="im-empty-text">Project not found.</div>
        </div>
      </div>
    );
  }

  const tabs: Array<{ key: Tab; label: string; count?: number }> = [
    { key: 'overview',   label: 'Overview' },
    { key: 'evidence',   label: 'Evidence',   count: projectEvidence.length },
    { key: 'monitoring', label: 'Monitoring', count: projectChecks.length },
    { key: 'claims',     label: 'Claims',     count: projectClaims.length },
  ];

  return (
    <div className="im-page">
      {/* Back */}
      <button className="im-btn im-btn-ghost" style={{ marginBottom: 16 }} onClick={() => navigate(IM_PATHS.projects)}>
        ← Projects
      </button>

      {/* Header card */}
      <div className="im-card" style={{ marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 28 }}>{PROJECT_TYPE_ICONS[project.type]}</span>
            <div>
              <div style={{ fontSize: 17, fontWeight: 800, color: '#f4f4f5' }}>{project.title}</div>
              <div style={{ fontSize: 12, color: '#71717a' }}>
                {PROJECT_TYPE_LABELS[project.type]} · {project.location.address}
                {project.ownerOrg && ` · ${project.ownerOrg}`}
              </div>
            </div>
          </div>
          <ProjectStatusBadge status={project.status} />
        </div>

        <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#71717a', flexWrap: 'wrap' }}>
          {project.areaHectares && <span>📐 {project.areaHectares.toLocaleString()} ha</span>}
          <span>📅 Started {new Date(project.startDate).toLocaleDateString()}</span>
          <span>👥 {project.beneficiaryGroup}</span>
          {review && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              Verification: <VerificationStatusBadge status={review.status} />
            </span>
          )}
        </div>

        {project.tags.length > 0 && (
          <div style={{ marginTop: 10, display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            {project.tags.map((t) => <span key={t} className="im-tag">{t}</span>)}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: '1.25rem', borderBottom: '1px solid rgba(16,185,129,0.12)', paddingBottom: 0 }}>
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '8px 14px',
              fontSize: 13, fontWeight: tab === t.key ? 700 : 500,
              color: tab === t.key ? '#10b981' : '#71717a',
              borderBottom: tab === t.key ? '2px solid #10b981' : '2px solid transparent',
              marginBottom: -1,
            }}
          >
            {t.label}{t.count !== undefined && ` (${t.count})`}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="im-card">
            <div className="im-section-title" style={{ marginBottom: 8 }}>Baseline</div>
            <p style={{ fontSize: 13, color: '#a1a1aa', margin: 0, lineHeight: 1.6 }}>{project.baselineSummary}</p>
          </div>
          <div className="im-card">
            <div className="im-section-title" style={{ marginBottom: 8 }}>Expected Outcome</div>
            <p style={{ fontSize: 13, color: '#a1a1aa', margin: 0, lineHeight: 1.6 }}>{project.expectedOutcome}</p>
          </div>
          {review?.notes && (
            <div className="im-card" style={{ borderColor: 'rgba(59,130,246,0.25)' }}>
              <div className="im-section-title" style={{ marginBottom: 8 }}>Verification Notes</div>
              <p style={{ fontSize: 13, color: '#a1a1aa', margin: 0, lineHeight: 1.6 }}>{review.notes}</p>
              {review.requestedEvidenceTypes && (
                <div style={{ marginTop: 8, fontSize: 12, color: '#fbbf24' }}>
                  Requested: {review.requestedEvidenceTypes.join(', ')}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {tab === 'evidence' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
            <button className="im-btn im-btn-outline" onClick={() => navigate(IM_PATHS.evidence)}>
              + Add Evidence
            </button>
          </div>
          {projectEvidence.length === 0 ? (
            <div className="im-empty">
              <div className="im-empty-icon">📷</div>
              <div className="im-empty-text">No evidence attached yet.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {projectEvidence.map((e) => <EvidenceCard key={e.id} evidence={e} />)}
            </div>
          )}
        </div>
      )}

      {tab === 'monitoring' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {projectChecks.length === 0 ? (
            <div className="im-empty">
              <div className="im-empty-icon">📡</div>
              <div className="im-empty-text">No monitoring checks yet.</div>
            </div>
          ) : projectChecks.map((c) => (
            <div key={c.id} className="im-card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#e4e4e7' }}>
                  Check — {new Date(c.scheduledDate).toLocaleDateString()}
                </div>
                <span className={`im-badge ${
                  c.status === 'completed' ? 'im-badge-green' :
                  c.status === 'in_progress' ? 'im-badge-blue' :
                  c.status === 'missed' ? 'im-badge-red' :
                  c.status === 'scheduled' ? 'im-badge-zinc' : 'im-badge-zinc'
                }`}>{c.status.replace('_', ' ')}</span>
              </div>
              {c.assignedTo && <div style={{ fontSize: 11, color: '#71717a', marginTop: 4 }}>Assigned to: {c.assignedTo}</div>}
              {c.findings && <p style={{ fontSize: 12, color: '#a1a1aa', margin: '6px 0 0', lineHeight: 1.5 }}>{c.findings}</p>}
            </div>
          ))}
        </div>
      )}

      {tab === 'claims' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {projectClaims.length === 0 ? (
            <div className="im-empty">
              <div className="im-empty-icon">🏷️</div>
              <div className="im-empty-text">No claims filed yet.</div>
            </div>
          ) : projectClaims.map((c) => (
            <div key={c.id} className="im-card">
              <ClaimTypeTag type={c.type} status={c.status} />
              {c.quantity && (
                <div style={{ fontSize: 12, color: '#a1a1aa', marginTop: 8 }}>
                  Quantity: {c.quantity.toLocaleString()} {c.unit}
                </div>
              )}
              {c.description && (
                <p style={{ fontSize: 12, color: '#a1a1aa', margin: '6px 0 0', lineHeight: 1.5 }}>{c.description}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProjectDetailPage;
