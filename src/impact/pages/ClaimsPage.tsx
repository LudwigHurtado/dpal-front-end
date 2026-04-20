import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useImpactStore } from '../store/useImpactStore';
import { IM_PATHS } from '../routes/paths';
import ClaimTypeTag from '../features/claims/components/ClaimTypeTag';
import * as claimsSvc from '../services/impactClaimsService';
import type { ClaimStatus, ClaimType } from '../types/claim';
import { CLAIM_TYPE_LABELS, CLAIM_STATUS_LABELS } from '../types/claim';

const ALL_CLAIM_TYPES: Array<ClaimType | 'all'> = [
  'all', 'carbon_reduction', 'plastic_recovery', 'resilience', 'biodiversity', 'community_impact',
];

const ClaimsPage: React.FC = () => {
  const navigate = useNavigate();
  const { claims, projects, loadClaimsForProject } = useImpactStore();
  const [filterType, setFilterType] = useState<ClaimType | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<ClaimStatus | 'all'>('all');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const load = async () => {
      for (const p of projects) await loadClaimsForProject(p.id);
      setLoaded(true);
    };
    if (projects.length > 0) load();
  }, [projects.length]);

  const filtered = claims.filter((c) => {
    if (filterType !== 'all' && c.type !== filterType) return false;
    if (filterStatus !== 'all' && c.status !== filterStatus) return false;
    return true;
  });

  const approved = claims.filter((c) => c.status === 'approved').length;
  const pending  = claims.filter((c) => c.status === 'under_review' || c.status === 'submitted').length;

  return (
    <div className="im-page">
      <div style={{ fontSize: 18, fontWeight: 800, color: '#f4f4f5', marginBottom: 4 }}>Claims</div>
      <div style={{ fontSize: 12, color: '#71717a', marginBottom: '1.25rem' }}>
        Environmental outcome claims across all projects
      </div>

      {/* Stats */}
      <div className="im-grid-3" style={{ marginBottom: '1.25rem' }}>
        <div className="im-stat">
          <div className="im-stat-value">{claims.length}</div>
          <div className="im-stat-label">Total Claims</div>
        </div>
        <div className="im-stat">
          <div className="im-stat-value">{approved}</div>
          <div className="im-stat-label">Approved</div>
        </div>
        <div className="im-stat">
          <div className="im-stat-value">{pending}</div>
          <div className="im-stat-label">Pending Review</div>
        </div>
      </div>

      {/* Type filters */}
      <div style={{ display: 'flex', gap: 6, marginBottom: '0.75rem', flexWrap: 'wrap' }}>
        {ALL_CLAIM_TYPES.map((t) => (
          <button
            key={t}
            className={`im-btn ${filterType === t ? 'im-btn-primary' : 'im-btn-ghost'}`}
            style={{ padding: '5px 12px', fontSize: 12 }}
            onClick={() => setFilterType(t)}
          >
            {t === 'all' ? 'All Types' : CLAIM_TYPE_LABELS[t as ClaimType]}
          </button>
        ))}
      </div>

      {/* Status filters */}
      <div style={{ display: 'flex', gap: 6, marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        {(['all', 'draft', 'submitted', 'under_review', 'approved', 'rejected'] as const).map((s) => (
          <button
            key={s}
            className={`im-btn ${filterStatus === s ? 'im-btn-outline' : 'im-btn-ghost'}`}
            style={{ padding: '4px 10px', fontSize: 11 }}
            onClick={() => setFilterStatus(s)}
          >
            {s === 'all' ? 'Any Status' : CLAIM_STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {!loaded ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}><span className="im-spinner" /></div>
      ) : filtered.length === 0 ? (
        <div className="im-empty">
          <div className="im-empty-icon">🏷️</div>
          <div className="im-empty-text">No claims match your filters.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map((c) => (
            <div
              key={c.id}
              className="im-card"
              style={{ cursor: 'pointer' }}
              onClick={() => navigate(IM_PATHS.projectDetail(c.projectId))}
            >
              <div style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#a1a1aa', marginBottom: 6 }}>
                  {c.projectTitle}
                </div>
                <ClaimTypeTag type={c.type} status={c.status} />
              </div>

              {c.quantity && (
                <div style={{ fontSize: 12, color: '#e4e4e7', fontWeight: 600 }}>
                  {c.quantity.toLocaleString()} {c.unit}
                </div>
              )}

              {c.description && (
                <p style={{ fontSize: 12, color: '#a1a1aa', margin: '6px 0 0', lineHeight: 1.5 }}>
                  {c.description}
                </p>
              )}

              {c.methodology && (
                <div style={{ fontSize: 11, color: '#52525b', marginTop: 6 }}>
                  Method: {c.methodology}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ClaimsPage;
