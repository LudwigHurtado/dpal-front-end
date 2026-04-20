import React, { useEffect, useState } from 'react';
import { useImpactStore } from '../store/useImpactStore';
import type { ImpactProject } from '../types/project';
import type { ImpactEvidence } from '../types/evidence';
import type { VerificationReview } from '../types/verification';
import type { ImpactClaim } from '../types/claim';

interface LedgerEntry {
  id: string;
  timestamp: string;
  type: 'project_created' | 'evidence_added' | 'check_completed' | 'claim_approved' | 'verification_updated';
  description: string;
  projectTitle: string;
  actor?: string;
  hash?: string;
}

function buildLedger(
  projects: ImpactProject[],
  evidence: ImpactEvidence[],
  reviews: VerificationReview[],
  claims: ImpactClaim[],
): LedgerEntry[] {
  const entries: LedgerEntry[] = [];

  projects.forEach((p) => {
    const hash = `0x${p.id.replace('proj-', '')}aef${p.createdAt.slice(0, 4)}`;
    entries.push({
      id: `lp-${p.id}`,
      timestamp: p.createdAt,
      type: 'project_created',
      description: `Project registered: "${p.title}"`,
      projectTitle: p.title,
      actor: p.ownerOrg ?? p.ownerId,
      hash,
    });
  });

  evidence.forEach((e) => {
    const project = projects.find((p) => p.id === e.projectId);
    if (!project) return;
    entries.push({
      id: `le-${e.id}`,
      timestamp: e.uploadedAt,
      type: 'evidence_added',
      description: `Evidence attached: ${e.caption ?? e.fileName ?? e.type}`,
      projectTitle: project.title,
      hash: `0x${e.id.replace('ev-', '')}b${e.uploadedAt.slice(2, 4)}`,
    });
  });

  reviews.forEach((r) => {
    if (r.status === 'verified') {
      entries.push({
        id: `lv-${r.id}`,
        timestamp: r.updatedAt,
        type: 'verification_updated',
        description: `Project verified by ${r.reviewerName ?? 'reviewer'}`,
        projectTitle: r.projectTitle,
        actor: r.reviewerName,
        hash: `0x${r.id.replace('ver-', '')}c${r.updatedAt.slice(2, 4)}`,
      });
    }
  });

  claims.forEach((c) => {
    if (c.status === 'approved') {
      entries.push({
        id: `lc-${c.id}`,
        timestamp: c.updatedAt,
        type: 'claim_approved',
        description: `Claim approved: ${c.quantity ? `${c.quantity.toLocaleString()} ${c.unit}` : c.type}`,
        projectTitle: c.projectTitle,
        hash: `0x${c.id.replace('clm-', '')}d${c.updatedAt.slice(2, 4)}`,
      });
    }
  });

  return entries.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}

const TYPE_ICONS: Record<LedgerEntry['type'], string> = {
  project_created:      '🌍',
  evidence_added:       '📷',
  check_completed:      '📡',
  claim_approved:       '✅',
  verification_updated: '🔒',
};

const LedgerPage: React.FC = () => {
  const { projects, evidence, reviews, claims, hydrate, loading } = useImpactStore();
  const [entries, setEntries] = useState<LedgerEntry[]>([]);

  useEffect(() => {
    hydrate();
  }, []);

  useEffect(() => {
    setEntries(buildLedger(projects, evidence, reviews, claims));
  }, [projects, evidence, reviews, claims]);

  return (
    <div className="im-page">
      <div style={{ fontSize: 18, fontWeight: 800, color: '#f4f4f5', marginBottom: 4 }}>Impact Ledger</div>
      <div style={{ fontSize: 12, color: '#71717a', marginBottom: '1.5rem' }}>
        Audit trail of verified actions across all projects
      </div>

      {loading && entries.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}><span className="im-spinner" /></div>
      ) : entries.length === 0 ? (
        <div className="im-empty">
          <div className="im-empty-icon">📜</div>
          <div className="im-empty-text">No ledger entries yet.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {entries.map((entry, i) => (
            <div
              key={entry.id}
              style={{
                display: 'flex',
                gap: 14,
                paddingBottom: i < entries.length - 1 ? 16 : 0,
                position: 'relative',
              }}
            >
              {/* Timeline line */}
              {i < entries.length - 1 && (
                <div style={{
                  position: 'absolute',
                  left: 17,
                  top: 32,
                  bottom: 0,
                  width: 1,
                  background: 'rgba(16,185,129,0.12)',
                }} />
              )}

              {/* Icon dot */}
              <div style={{
                width: 34,
                height: 34,
                flexShrink: 0,
                background: 'rgba(16,185,129,0.08)',
                border: '1px solid rgba(16,185,129,0.2)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 16,
                zIndex: 1,
              }}>
                {TYPE_ICONS[entry.type]}
              </div>

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0, paddingTop: 4 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#e4e4e7' }}>
                  {entry.description}
                </div>
                <div style={{ fontSize: 11, color: '#71717a', marginTop: 2 }}>
                  {entry.projectTitle}
                  {entry.actor && ` · ${entry.actor}`}
                  {` · ${new Date(entry.timestamp).toLocaleString()}`}
                </div>
                {entry.hash && (
                  <div style={{
                    marginTop: 4,
                    fontSize: 10,
                    color: '#3f3f46',
                    fontFamily: 'monospace',
                    background: 'rgba(16,185,129,0.04)',
                    padding: '2px 6px',
                    borderRadius: 4,
                    display: 'inline-block',
                  }}>
                    {entry.hash}…
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default LedgerPage;
