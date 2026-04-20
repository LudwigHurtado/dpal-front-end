import React, { useEffect, useState } from 'react';
import { useImpactStore } from '../store/useImpactStore';
import EvidenceCard from '../features/evidence/components/EvidenceCard';
import * as evidenceSvc from '../services/impactEvidenceService';
import type { EvidenceType } from '../types/evidence';
import { EVIDENCE_TYPE_LABELS } from '../types/evidence';

const ALL_TYPES: Array<EvidenceType | 'all'> = ['all', 'image', 'video', 'document', 'field_note', 'satellite'];

const EvidencePage: React.FC = () => {
  const { projects, evidence, loadEvidenceForProject } = useImpactStore();
  const [filter, setFilter] = useState<EvidenceType | 'all'>('all');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const load = async () => {
      for (const p of projects) await loadEvidenceForProject(p.id);
      setLoaded(true);
    };
    if (projects.length > 0) load();
  }, [projects.length]);

  const filtered = evidence.filter((e) => {
    if (filter !== 'all' && e.type !== filter) return false;
    if (projectFilter !== 'all' && e.projectId !== projectFilter) return false;
    return true;
  });

  return (
    <div className="im-page">
      <div className="im-section-header">
        <div>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#f4f4f5' }}>Evidence</div>
          <div style={{ fontSize: 12, color: '#71717a' }}>{filtered.length} items</div>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: '0.75rem', flexWrap: 'wrap' }}>
        {ALL_TYPES.map((t) => (
          <button
            key={t}
            className={`im-btn ${filter === t ? 'im-btn-primary' : 'im-btn-ghost'}`}
            style={{ padding: '5px 12px', fontSize: 12 }}
            onClick={() => setFilter(t)}
          >
            {t === 'all' ? 'All Types' : EVIDENCE_TYPE_LABELS[t as EvidenceType]}
          </button>
        ))}
      </div>

      <div style={{ marginBottom: '1.25rem' }}>
        <select
          className="im-select"
          style={{ maxWidth: 280 }}
          value={projectFilter}
          onChange={(e) => setProjectFilter(e.target.value)}
        >
          <option value="all">All Projects</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.title}</option>
          ))}
        </select>
      </div>

      {!loaded ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}><span className="im-spinner" /></div>
      ) : filtered.length === 0 ? (
        <div className="im-empty">
          <div className="im-empty-icon">📷</div>
          <div className="im-empty-text">No evidence matches your filters.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map((e) => <EvidenceCard key={e.id} evidence={e} />)}
        </div>
      )}
    </div>
  );
};

export default EvidencePage;
