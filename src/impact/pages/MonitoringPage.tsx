import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useImpactStore } from '../store/useImpactStore';
import { IM_PATHS } from '../routes/paths';
import * as monitorSvc from '../services/impactMonitoringService';
import type { MonitoringCheck, CheckStatus } from '../types/monitoring';
import { CHECK_STATUS_LABELS } from '../types/monitoring';

const STATUS_CLS: Record<CheckStatus, string> = {
  scheduled:   'im-badge-zinc',
  in_progress: 'im-badge-blue',
  completed:   'im-badge-green',
  missed:      'im-badge-red',
  cancelled:   'im-badge-zinc',
};

const MonitoringPage: React.FC = () => {
  const navigate = useNavigate();
  const { projects } = useImpactStore();
  const [checks, setChecks] = useState<MonitoringCheck[]>([]);
  const [filter, setFilter] = useState<CheckStatus | 'all'>('all');
  const [loaded, setLoaded] = useState(false);
  const [completing, setCompleting] = useState<string | null>(null);
  const [findingsInput, setFindingsInput] = useState<Record<string, string>>({});

  useEffect(() => {
    monitorSvc.listChecks().then((c) => { setChecks(c); setLoaded(true); });
  }, []);

  const filtered = filter === 'all' ? checks : checks.filter((c) => c.status === filter);

  const handleComplete = async (id: string) => {
    const findings = findingsInput[id] ?? '';
    await monitorSvc.completeCheck(id, findings, []);
    setChecks((prev) =>
      prev.map((c) => c.id === id ? { ...c, status: 'completed', findings, completedDate: new Date().toISOString().split('T')[0] } : c)
    );
    setCompleting(null);
  };

  const statCounts: Record<CheckStatus | 'all', number> = {
    all:         checks.length,
    scheduled:   checks.filter((c) => c.status === 'scheduled').length,
    in_progress: checks.filter((c) => c.status === 'in_progress').length,
    completed:   checks.filter((c) => c.status === 'completed').length,
    missed:      checks.filter((c) => c.status === 'missed').length,
    cancelled:   checks.filter((c) => c.status === 'cancelled').length,
  };

  return (
    <div className="im-page">
      <div className="im-section-header">
        <div>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#f4f4f5' }}>Monitoring</div>
          <div style={{ fontSize: 12, color: '#71717a' }}>Scheduled field checks across all projects</div>
        </div>
      </div>

      {/* Stats */}
      <div className="im-grid-3" style={{ marginBottom: '1.25rem' }}>
        <div className="im-stat">
          <div className="im-stat-value">{statCounts.scheduled + statCounts.in_progress}</div>
          <div className="im-stat-label">Upcoming</div>
        </div>
        <div className="im-stat">
          <div className="im-stat-value">{statCounts.completed}</div>
          <div className="im-stat-label">Completed</div>
        </div>
        <div className="im-stat">
          <div className="im-stat-value" style={{ color: statCounts.missed > 0 ? '#f87171' : '#10b981' }}>
            {statCounts.missed}
          </div>
          <div className="im-stat-label">Missed</div>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        {(['all', 'scheduled', 'in_progress', 'completed', 'missed'] as const).map((s) => (
          <button
            key={s}
            className={`im-btn ${filter === s ? 'im-btn-primary' : 'im-btn-ghost'}`}
            style={{ padding: '5px 12px', fontSize: 12 }}
            onClick={() => setFilter(s)}
          >
            {s === 'all' ? 'All' : CHECK_STATUS_LABELS[s]} ({statCounts[s]})
          </button>
        ))}
      </div>

      {!loaded ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}><span className="im-spinner" /></div>
      ) : filtered.length === 0 ? (
        <div className="im-empty">
          <div className="im-empty-icon">📡</div>
          <div className="im-empty-text">No checks match the selected filter.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map((check) => (
            <div key={check.id} className="im-card">
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                <div>
                  <div
                    style={{ fontSize: 13, fontWeight: 700, color: '#e4e4e7', cursor: 'pointer' }}
                    onClick={() => navigate(IM_PATHS.projectDetail(check.projectId))}
                  >
                    {check.projectTitle}
                  </div>
                  <div style={{ fontSize: 11, color: '#71717a', marginTop: 2 }}>
                    Scheduled: {new Date(check.scheduledDate).toLocaleDateString()}
                    {check.completedDate && ` · Completed: ${new Date(check.completedDate).toLocaleDateString()}`}
                    {check.assignedTo && ` · ${check.assignedTo}`}
                  </div>
                </div>
                <span className={`im-badge ${STATUS_CLS[check.status]}`}>{CHECK_STATUS_LABELS[check.status]}</span>
              </div>

              {check.findings && (
                <p style={{ fontSize: 12, color: '#a1a1aa', margin: '8px 0 0', lineHeight: 1.5 }}>{check.findings}</p>
              )}

              {(check.status === 'in_progress' || check.status === 'scheduled') && (
                <div style={{ marginTop: 10 }}>
                  {completing === check.id ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <textarea
                        className="im-textarea"
                        placeholder="Enter findings from this monitoring check..."
                        value={findingsInput[check.id] ?? ''}
                        onChange={(e) => setFindingsInput((f) => ({ ...f, [check.id]: e.target.value }))}
                        style={{ minHeight: 60 }}
                      />
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button className="im-btn im-btn-primary" onClick={() => handleComplete(check.id)}>
                          Mark Complete
                        </button>
                        <button className="im-btn im-btn-ghost" onClick={() => setCompleting(null)}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button className="im-btn im-btn-outline" onClick={() => setCompleting(check.id)}>
                      Log Findings
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MonitoringPage;
