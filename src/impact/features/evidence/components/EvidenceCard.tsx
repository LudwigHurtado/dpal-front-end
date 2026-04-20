import React from 'react';
import type { ImpactEvidence } from '../../../types/evidence';
import { EVIDENCE_TYPE_ICONS, EVIDENCE_TYPE_LABELS } from '../../../types/evidence';

interface Props {
  evidence: ImpactEvidence;
}

const EvidenceCard: React.FC<Props> = ({ evidence }) => (
  <div className="im-card" style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
    <div
      style={{
        width: 40,
        height: 40,
        flexShrink: 0,
        background: 'rgba(16,185,129,0.08)',
        borderRadius: 8,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 20,
      }}
    >
      {EVIDENCE_TYPE_ICONS[evidence.type]}
    </div>
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: '#f4f4f5', marginBottom: 2 }}>
        {evidence.caption ?? evidence.fileName ?? 'No caption'}
      </div>
      <div style={{ fontSize: 11, color: '#71717a' }}>
        {EVIDENCE_TYPE_LABELS[evidence.type]} ·{' '}
        {new Date(evidence.capturedAt).toLocaleDateString()}
        {evidence.geoTag && ` · 📍 ${evidence.geoTag.lat.toFixed(4)}, ${evidence.geoTag.lng.toFixed(4)}`}
      </div>
      {evidence.fieldNotes && (
        <p style={{ fontSize: 12, color: '#a1a1aa', margin: '6px 0 0', lineHeight: 1.5 }}>
          {evidence.fieldNotes}
        </p>
      )}
      {evidence.tags.length > 0 && (
        <div style={{ marginTop: 6, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {evidence.tags.map((t) => (
            <span key={t} className="im-tag">{t}</span>
          ))}
        </div>
      )}
    </div>
  </div>
);

export default EvidenceCard;
