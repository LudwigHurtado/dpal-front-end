import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useImpactStore } from '../store/useImpactStore';
import { IM_PATHS } from '../routes/paths';
import VerificationStatusBadge from '../features/verification/components/VerificationStatusBadge';
import * as verifSvc from '../services/impactVerificationService';
import type { VerificationStatus, VerificationReview } from '../types/verification';
import { VERIFICATION_STATUS_LABELS } from '../types/verification';

const PIPELINE: VerificationStatus[] = ['submitted', 'needs_evidence', 'under_review', 'verified', 'flagged', 'rejected'];

const VerificationQueuePage: React.FC = () => {
  const navigate = useNavigate();
  const { reviews, hydrate } = useImpactStore();
  const [filter, setFilter] = useState<VerificationStatus | 'all'>('all');
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [nextStatus, setNextStatus] = useState<VerificationStatus>('under_review');
  const [saving, setSaving] = useState(false);

  useEffect(() => { hydrate(); }, []);

  const filtered = filter === 'all' ? reviews : reviews.filter((r) => r.status === filter);

  const counts: Record<VerificationStatus | 'all', number> = {
    all:            reviews.length,
    submitted:      reviews.filter((r) => r.status === 'submitted').length,
    needs_evidence: reviews.filter((r) => r.status === 'needs_evidence').length,
    under_review:   reviews.filter((r) => r.status === 'under_review').length,
    verified:       reviews.filter((r) => r.status === 'verified').length,
    flagged:        reviews.filter((r) => r.status === 'flagged').length,
    rejected:       reviews.filter((r) => r.status === 'rejected').length,
  };

  const startAction = (review: VerificationReview) => {
    setActioningId(review.id);
    setNotes(review.notes ?? '');
    setNextStatus(review.status === 'submitted' ? 'under_review' : review.status);
  };

  const submitAction = async () => {
    if (!actioningId) return;
    setSaving(true);
    await verifSvc.updateReview(actioningId, { status: nextStatus, notes });
    await hydrate();
    setActioningId(null);
    setSaving(false);
  };

  return (
    <div className="im-page">
      <div style={{ fontSize: 18, fontWeight: 800, color: '#f4f4f5', marginBottom: 4 }}>Verification Queue</div>
      <div style={{ fontSize: 12, color: '#71717a', marginBottom: '1.25rem' }}>
        Review and update the verification status of submitted projects
      </div>

      {/* Pipeline summary */}
      <div style={{ display: 'flex', gap: 10, marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        {PIPELINE.map((s) => counts[s] > 0 && (
          <div
            key={s}
            className="im-stat"
            style={{ padding: '8px 14px', cursor: 'pointer', minWidth: 90 }}
            onClick={() => setFilter(s)}
          >
            <div className="im-stat-value" style={{ fontSize: 18 }}>{counts[s]}</div>
            <div className="im-stat-label" style={{ fontSize: 10 }}>{VERIFICATION_STATUS_LABELS[s]}</div>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div style={{ display: 'flex', gap: 6, marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <button
          className={`im-btn ${filter === 'all' ? 'im-btn-primary' : 'im-btn-ghost'}`}
          style={{ padding: '5px 12px', fontSize: 12 }}
          onClick={() => setFilter('all')}
        >
          All ({counts.all})
        </button>
        {PIPELINE.map((s) => (
          <button
            key={s}
            className={`im-btn ${filter === s ? 'im-btn-primary' : 'im-btn-ghost'}`}
            style={{ padding: '5px 12px', fontSize: 12 }}
            onClick={() => setFilter(s)}
          >
            {VERIFICATION_STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="im-empty">
          <div className="im-empty-icon">✅</div>
          <div className="im-empty-text">No reviews in this status.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map((r) => (
            <div key={r.id} className="im-card">
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 6 }}>
                <div>
                  <div
                    style={{ fontSize: 14, fontWeight: 700, color: '#e4e4e7', cursor: 'pointer' }}
                    onClick={() => navigate(IM_PATHS.projectDetail(r.projectId))}
                  >
                    {r.projectTitle}
                  </div>
                  <div style={{ fontSize: 11, color: '#71717a', marginTop: 2 }}>
                    Submitted: {new Date(r.submittedAt).toLocaleDateString()}
                    {r.reviewerName && ` · Reviewer: ${r.reviewerName}`}
                    {` · 📷 ${r.evidenceCount} evidence items`}
                  </div>
                </div>
                <VerificationStatusBadge status={r.status} />
              </div>

              {r.notes && (
                <p style={{ fontSize: 12, color: '#a1a1aa', margin: '0 0 8px', lineHeight: 1.5 }}>{r.notes}</p>
              )}

              {r.requestedEvidenceTypes && (
                <div style={{ fontSize: 12, color: '#fbbf24', marginBottom: 8 }}>
                  Requested: {r.requestedEvidenceTypes.join(', ')}
                </div>
              )}

              {actioningId === r.id ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
                  <div className="im-form-row">
                    <div className="im-field">
                      <label className="im-label">Update Status</label>
                      <select
                        className="im-select"
                        value={nextStatus}
                        onChange={(e) => setNextStatus(e.target.value as VerificationStatus)}
                      >
                        {PIPELINE.map((s) => (
                          <option key={s} value={s}>{VERIFICATION_STATUS_LABELS[s]}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="im-field">
                    <label className="im-label">Notes</label>
                    <textarea
                      className="im-textarea"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Add reviewer notes..."
                      style={{ minHeight: 60 }}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="im-btn im-btn-primary" onClick={submitAction} disabled={saving}>
                      {saving ? 'Saving…' : 'Save'}
                    </button>
                    <button className="im-btn im-btn-ghost" onClick={() => setActioningId(null)}>Cancel</button>
                  </div>
                </div>
              ) : (
                <button className="im-btn im-btn-outline" style={{ marginTop: 4 }} onClick={() => startAction(r)}>
                  Review
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default VerificationQueuePage;
