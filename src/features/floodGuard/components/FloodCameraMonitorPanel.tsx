import React, { useState } from 'react';
import { Camera, Eye, Send } from '../../../../components/icons';
import type { FloodCameraDetection, FloodZone } from '../floodGuardTypes';
import { formatRelativeTimestamp } from './floodGuardUi';

interface FloodCameraMonitorPanelProps {
  zone: FloodZone;
  detections: FloodCameraDetection[];
  onSubmitTestDetection?: (detection: FloodCameraDetection) => void;
  className?: string;
}

const DEFAULT_LABELS = ['flash_flood', 'moving_water', 'standing_water', 'river_level_rise'];

const FloodCameraMonitorPanel: React.FC<FloodCameraMonitorPanelProps> = ({
  zone,
  detections,
  onSubmitTestDetection,
  className = '',
}) => {
  const [label, setLabel] = useState<string>(DEFAULT_LABELS[0]);
  const [confidence, setConfidence] = useState(0.85);
  const [cameraId, setCameraId] = useState('CAM-DEMO-001');

  const handleSubmit = () => {
    if (!onSubmitTestDetection) return;
    const now = new Date().toISOString();
    const detection: FloodCameraDetection = {
      detectionId: `CAM-DET-${cameraId}-${now.slice(11, 19).replace(/:/g, '')}`,
      cameraId,
      cameraLabel: `${cameraId} (test feed)`,
      zoneId: zone.zoneId,
      label,
      confidence,
      timestamp: now,
      notes: 'Test detection submitted via FloodGuard camera intake panel.',
    };
    onSubmitTestDetection(detection);
  };

  return (
    <div
      className={`rounded-2xl p-5 border dpal-border-subtle ${className}`}
      style={{ background: 'var(--dpal-card)' }}
    >
      <div className="flex items-center gap-2 mb-3">
        <Camera className="w-4 h-4" style={{ color: 'var(--dpal-primary)' }} />
        <div className="text-[10px] font-black tracking-widest uppercase dpal-text-muted">
          Live Detection · Camera Monitor
        </div>
      </div>

      {/* Stage 12J — operator helper panel */}
      <div
        className="rounded-xl px-3 py-3 mb-3 text-[11px] leading-relaxed"
        style={{
          background: 'var(--dpal-surface-alt)',
          border: '1px dashed var(--dpal-border)',
          color: 'var(--dpal-text-secondary)',
        }}
      >
        <div className="text-[10px] font-bold uppercase tracking-wider dpal-text-muted mb-1">
          Live Detection
        </div>
        <p>
          This tab shows active flood signals for the selected city and zone. Use it to review
          current alerts, inspect camera and citizen detections, and submit a safe test detection
          during demo mode.
        </p>
        <p className="mt-2">
          FloodGuard <span className="font-semibold">starts</span> with rainfall, satellite water
          expansion, and water-level monitoring. Camera and citizen detections are{' '}
          <span className="font-semibold">supporting</span> signals, not the primary starting layer.
        </p>
      </div>

      <div className="text-sm font-semibold mb-1" style={{ color: 'var(--dpal-text-primary)' }}>
        {zone.name}
      </div>
      <div className="text-[11px] dpal-text-muted mb-4">
        {detections.length} camera detection(s) ingested for this zone.
      </div>

      {detections.length > 0 ? (
        <ul className="space-y-2 mb-4">
          {detections.map((detection) => (
            <li
              key={detection.detectionId}
              className="rounded-xl p-3"
              style={{ background: 'var(--dpal-surface-alt)' }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold" style={{ color: 'var(--dpal-text-primary)' }}>
                    {detection.cameraLabel}
                  </div>
                  <div className="text-[11px] dpal-text-muted font-mono">{detection.cameraId}</div>
                </div>
                <span
                  className="text-[10px] font-bold uppercase tracking-wider rounded-md px-1.5 py-0.5"
                  style={{
                    background: 'rgba(34,211,238,0.12)',
                    color: '#22d3ee',
                    border: '1px solid rgba(34,211,238,0.4)',
                  }}
                >
                  {detection.label}
                </span>
              </div>
              <div className="mt-2 flex items-center gap-3 text-[11px] dpal-text-muted">
                <span>Confidence {(detection.confidence * 100).toFixed(0)}%</span>
                <span>·</span>
                <span>{formatRelativeTimestamp(detection.timestamp)}</span>
                {detection.streamUrl && (
                  <>
                    <span>·</span>
                    <a
                      href={detection.streamUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="underline flex items-center gap-1"
                    >
                      <Eye className="w-3.5 h-3.5" /> stream
                    </a>
                  </>
                )}
              </div>
              {detection.notes && (
                <div className="mt-1.5 text-[11px]" style={{ color: 'var(--dpal-text-secondary)' }}>
                  {detection.notes}
                </div>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <div
          className="rounded-xl px-3 py-2 text-[11px] dpal-text-muted mb-4"
          style={{ background: 'var(--dpal-surface-alt)' }}
        >
          No camera detections ingested for this zone yet.
        </div>
      )}

      {onSubmitTestDetection && (
        <div
          className="rounded-xl p-3 border dpal-border-subtle"
          style={{ background: 'var(--dpal-surface)' }}
        >
          <div className="text-[10px] font-bold uppercase tracking-wider dpal-text-muted mb-1">
            Demo Test Detection
          </div>
          <div className="text-[11px] mb-2" style={{ color: 'var(--dpal-text-secondary)' }}>
            Use this form to simulate a flood signal and verify that the alert feed, risk score,
            validator workflow, and evidence packet flow update correctly. POSTs to{' '}
            <code>/api/floodguard/camera-alert</code>.
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <label className="text-[11px] dpal-text-muted">
              Camera id
              <input
                type="text"
                value={cameraId}
                onChange={(e) => setCameraId(e.target.value)}
                className="mt-1 w-full rounded-md px-2 py-1 text-xs"
                style={{ background: 'var(--dpal-input-bg)', color: 'var(--dpal-input-text)', border: '1px solid var(--dpal-input-border)' }}
              />
            </label>
            <label className="text-[11px] dpal-text-muted">
              Label
              <select
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                className="mt-1 w-full rounded-md px-2 py-1 text-xs"
                style={{ background: 'var(--dpal-input-bg)', color: 'var(--dpal-input-text)', border: '1px solid var(--dpal-input-border)' }}
              >
                {DEFAULT_LABELS.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </label>
            <label className="text-[11px] dpal-text-muted">
              Confidence
              <input
                type="number"
                min={0}
                max={1}
                step={0.05}
                value={confidence}
                onChange={(e) => setConfidence(Number(e.target.value))}
                className="mt-1 w-full rounded-md px-2 py-1 text-xs"
                style={{ background: 'var(--dpal-input-bg)', color: 'var(--dpal-input-text)', border: '1px solid var(--dpal-input-border)' }}
              />
            </label>
          </div>
          <button
            type="button"
            onClick={handleSubmit}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition hover:opacity-90"
            style={{ background: 'var(--dpal-primary)', color: 'var(--md-sys-color-on-primary, #00201a)' }}
          >
            <Send className="w-3.5 h-3.5" /> Submit detection
          </button>
        </div>
      )}
    </div>
  );
};

export default FloodCameraMonitorPanel;
