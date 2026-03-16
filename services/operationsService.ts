import { getApiBase } from '../constants';

const apiBase = getApiBase();

export async function fetchOpsConfidence() {
  const res = await fetch(`${apiBase}/api/ops/confidence`);
  if (!res.ok) throw new Error(`ops_confidence_failed_${res.status}`);
  return res.json();
}

export async function fetchTransparencyMetrics() {
  const res = await fetch(`${apiBase}/api/public/transparency/metrics`);
  if (!res.ok) throw new Error(`transparency_metrics_failed_${res.status}`);
  return res.json();
}

export async function computeVerifierScore(payload: Record<string, number>) {
  const res = await fetch(`${apiBase}/api/verifier/score`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`verifier_score_failed_${res.status}`);
  return res.json();
}
