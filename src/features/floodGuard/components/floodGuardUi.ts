/**
 * Shared visual tokens and helpers for the FloodGuard UI.
 * Keep raw hex values out of components — extend this file instead.
 */

import type {
  FloodAlertLevel,
  FloodAlertLifecycle,
  FloodConfidenceBand,
  FloodRiskCategory,
} from '../floodGuardTypes';

export const ALERT_LEVEL_COLORS: Record<FloodAlertLevel, { fg: string; bg: string; border: string; label: string }> = {
  0: { fg: '#10b981', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.45)', label: 'Normal' },
  1: { fg: '#22d3ee', bg: 'rgba(34,211,238,0.12)', border: 'rgba(34,211,238,0.45)', label: 'Rain Watch' },
  2: { fg: '#facc15', bg: 'rgba(250,204,21,0.14)', border: 'rgba(250,204,21,0.5)',  label: 'Flood Risk' },
  3: { fg: '#fb923c', bg: 'rgba(251,146,60,0.16)', border: 'rgba(251,146,60,0.55)', label: 'Flood Alert' },
  4: { fg: '#ef4444', bg: 'rgba(239,68,68,0.18)',  border: 'rgba(239,68,68,0.6)',   label: 'Critical Flood' },
  5: { fg: '#f43f5e', bg: 'rgba(244,63,94,0.22)',  border: 'rgba(244,63,94,0.7)',   label: 'Rescue Needed' },
};

export const RISK_CATEGORY_COLORS: Record<FloodRiskCategory, string> = {
  low: '#10b981',
  moderate: '#facc15',
  high: '#fb923c',
  critical: '#ef4444',
};

export const CONFIDENCE_LABEL: Record<FloodConfidenceBand, string> = {
  low: 'Low confidence',
  medium: 'Medium confidence',
  high: 'High confidence',
};

export const LIFECYCLE_LABEL: Record<FloodAlertLifecycle, string> = {
  ai_detected: 'AI detected',
  evidence_assembled: 'Evidence assembled',
  human_review_pending: 'Human review pending',
  human_verified: 'Human verified',
  city_notified: 'City notified',
  resolved: 'Resolved',
  archived: 'Archived',
};

export const LIFECYCLE_ORDER: FloodAlertLifecycle[] = [
  'ai_detected',
  'evidence_assembled',
  'human_review_pending',
  'human_verified',
  'city_notified',
  'resolved',
  'archived',
];

export function lifecycleProgress(lifecycle: FloodAlertLifecycle): number {
  const idx = LIFECYCLE_ORDER.indexOf(lifecycle);
  if (idx < 0) return 0;
  return Math.round(((idx + 1) / LIFECYCLE_ORDER.length) * 100);
}

export function formatRelativeTimestamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const diffSec = Math.round((Date.now() - date.getTime()) / 1000);
  if (Math.abs(diffSec) < 60) return `${diffSec}s ago`;
  const diffMin = Math.round(diffSec / 60);
  if (Math.abs(diffMin) < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (Math.abs(diffHr) < 24) return `${diffHr}h ago`;
  const diffDay = Math.round(diffHr / 24);
  return `${diffDay}d ago`;
}
