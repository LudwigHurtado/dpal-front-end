import type { AgentFindingDraft, MrvProjectBundle } from './types';

/** Rule-based readiness score from project bundle — no invented satellite/carbon outcomes. */
export function computeReadinessScore(
  bundle: MrvProjectBundle,
  findings: AgentFindingDraft[],
): number {
  let score = 100;
  const config = bundle.config as Record<string, unknown> | null;

  if (!config) score -= 25;
  else {
    const location = config.location as Record<string, unknown> | undefined;
    const lat = String(location?.latitude ?? '').trim();
    const lng = String(location?.longitude ?? '').trim();
    if (!lat || !lng) score -= 15;
    const aoi = String(location?.aoiSummary ?? location?.aoiId ?? '').trim();
    if (!aoi) score -= 10;
    const name = String(config.projectName ?? '').trim();
    if (!name) score -= 5;
  }

  if (!bundle.dmrvReport) score -= 10;
  if (bundle.evidencePacketCount === 0) score -= 10;

  for (const f of findings) {
    if (f.severity === 'CRITICAL') score -= 12;
    else if (f.severity === 'WARNING') score -= 5;
  }

  return Math.max(0, Math.min(100, score));
}
