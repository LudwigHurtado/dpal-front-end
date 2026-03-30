import React from 'react';
import type { SafetyStatus, Trip } from '../tripTypes';
import { safetyTone } from '../tripUtils';

const toneToCopy: Record<'ok' | 'warn' | 'urgent', { title: string; detail: string }> = {
  ok: {
    title: 'Safety first',
    detail: 'Verified options and trip traceability help keep rides calm and clear.',
  },
  warn: {
    title: 'Safety check recommended',
    detail: 'Review pickup details and keep communication in-app when possible.',
  },
  urgent: {
    title: 'Urgent support',
    detail: 'If this is an emergency, contact local emergency services. Use the emergency support action for in-app escalation.',
  },
};

function label(status: SafetyStatus | undefined): string {
  if (!status) return 'Standard';
  return status.replace(/_/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());
}

const TripSafetyBanner: React.FC<{ trip: Trip }> = ({ trip }) => {
  const tone = safetyTone(trip.safetyStatus);
  const copy = toneToCopy[tone];
  const border =
    tone === 'urgent' ? 'rgba(251,113,133,0.30)' : tone === 'warn' ? 'rgba(245,158,11,0.30)' : 'rgba(22,163,74,0.24)';
  const bg =
    tone === 'urgent' ? 'rgba(251,113,133,0.10)' : tone === 'warn' ? 'rgba(245,158,11,0.10)' : 'rgba(22,163,74,0.08)';

  return (
    <div className="gw-card p-5" style={{ borderColor: border, background: bg }}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-extrabold text-slate-800">{copy.title}</div>
          <div className="text-sm text-slate-600 mt-1">{copy.detail}</div>
        </div>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '6px 10px',
            borderRadius: 999,
            border: `1px solid ${border}`,
            background: 'rgba(255,255,255,0.6)',
            fontSize: 12,
            fontWeight: 800,
            color: tone === 'urgent' ? '#9f1239' : tone === 'warn' ? '#92400e' : '#166534',
          }}
        >
          {label(trip.safetyStatus)}
        </span>
      </div>
    </div>
  );
};

export default TripSafetyBanner;

