import type { ForestIntegrityScanResponse } from '../types';

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

/** Inverted integrity score → headline risk band for operator dashboards. */
export function overallIntegrityRiskBand(scan: ForestIntegrityScanResponse | null): {
  band: string;
  scoreLine: string;
  detail: string;
} {
  if (!scan) {
    return { band: 'Awaiting scan', scoreLine: 'N/A', detail: 'Run a manual scan or Watch DPAL Work.' };
  }
  if (scan.forestIntegrityScore == null) {
    return { band: 'Insufficient data', scoreLine: 'N/A', detail: scan.riskLevel === 'unknown' ? 'Configure EO / FIRMS / GFW lanes on the API host.' : scan.riskLevel };
  }
  const s = scan.forestIntegrityScore;
  let band = 'MEDIUM';
  if (scan.riskLevel === 'strong_integrity') band = 'LOW';
  else if (scan.riskLevel === 'watchlist') band = 'ELEVATED';
  else if (scan.riskLevel === 'elevated_risk') band = 'HIGH';
  else if (scan.riskLevel === 'critical_concern') band = 'CRITICAL';
  return {
    band,
    scoreLine: `${s} / 100`,
    detail: 'Higher score reflects stronger modeled forest integrity (see limitations).',
  };
}

/** Mirrors backend `evid` lane (0–10) from configured provider returns — not a legal certification. */
export function evidenceCompletenessPoints(scan: ForestIntegrityScanResponse | null): number | null {
  if (!scan) return null;
  const sentinelUsable = scan.providers.sentinel.status === 'available';
  const firmsConfigured = scan.providers.firms.status !== 'not_configured';
  const gfwConfigured = scan.providers.gfw.status !== 'not_configured';
  let lanes = 0;
  let okLanes = 0;
  if (true) {
    lanes += 1;
    if (sentinelUsable) okLanes += 1;
  }
  if (firmsConfigured) {
    lanes += 1;
    if (typeof scan.providers.firms.activeFires === 'number') okLanes += 1;
  }
  if (gfwConfigured) {
    lanes += 1;
    if (typeof scan.providers.gfw.alerts === 'number') okLanes += 1;
  }
  if (lanes <= 0) return null;
  return clamp(Math.round(10 * (okLanes / lanes)), 0, 10);
}

export function dataConfidencePercent(scan: ForestIntegrityScanResponse | null): number | null {
  if (!scan) return null;
  const blocks = [scan.providers.sentinel, scan.providers.firms, scan.providers.gfw, scan.providers.gedi];
  const applicable = blocks.filter((b) => b.status !== 'not_configured');
  if (applicable.length === 0) return null;
  const ok = applicable.filter((b) => b.status === 'available').length;
  return Math.round((ok / applicable.length) * 100);
}

export function deforestationLaneSummary(scan: ForestIntegrityScanResponse | null): {
  headline: string;
  subline: string;
} {
  if (!scan) return { headline: 'Awaiting scan', subline: '—' };
  const g = scan.providers.gfw;
  if (g.status === 'not_configured') return { headline: 'Not configured', subline: g.message };
  if (g.status === 'auth_error') return { headline: 'Auth error', subline: g.message };
  if (g.status === 'rate_limited') return { headline: 'Rate limited', subline: g.message };
  if (g.status === 'failed' || g.status === 'unavailable') return { headline: 'Provider failed', subline: g.message };
  const int = g.integratedAlerts;
  if (typeof int !== 'number') return { headline: 'Unavailable', subline: g.message };
  let headline = 'LOW';
  if (int >= 5) headline = 'HIGH';
  else if (int >= 1) headline = 'MEDIUM';
  return {
    headline,
    subline: `${int} integrated alert(s) in window (GFW; not field verified).`,
  };
}

export function fireLaneSummary(scan: ForestIntegrityScanResponse | null): {
  headline: string;
  subline: string;
} {
  if (!scan) return { headline: 'Awaiting scan', subline: '—' };
  const f = scan.providers.firms;
  if (f.status === 'not_configured') return { headline: 'Not configured', subline: f.message };
  if (f.status === 'failed') return { headline: 'Provider failed', subline: f.message };
  const n = f.activeFires;
  if (typeof n !== 'number') return { headline: 'Unavailable', subline: f.message };
  let headline = 'LOW';
  if (n >= 4) headline = 'HIGH';
  else if (n >= 1) headline = 'MEDIUM';
  return { headline, subline: `${n} VIIRS SNPP NRT row(s) (thermal proxy).` };
}

export function carbonLaneSummary(scan: ForestIntegrityScanResponse | null): { headline: string; subline: string } {
  if (!scan) return { headline: 'Awaiting scan', subline: '—' };
  const g = scan.providers.gedi;
  if (g.status === 'not_configured') return { headline: 'Not configured', subline: g.message };
  return { headline: g.status === 'available' ? 'Available' : 'Unavailable', subline: g.message };
}

/** Same 0–20 “deforestation lane” points as backend scoring when inputs exist (integrity, not legal risk). */
export function deforestationLanePoints20(scan: ForestIntegrityScanResponse | null): number | null {
  if (!scan) return null;
  const gfw = scan.providers.gfw;
  const gfwConfigured = gfw.status !== 'not_configured';
  if (!gfwConfigured) return null;
  const gfwAvailable = gfw.status === 'available';
  const gfwAlerts = typeof gfw.alerts === 'number' ? gfw.alerts : null;
  if (gfwAvailable && gfwAlerts != null) {
    return gfwAlerts === 0 ? 20 : clamp(20 - Math.min(20, gfwAlerts * 5), 0, 20);
  }
  return null;
}

/** Same 0–20 “fire lane” points as backend when FIRMS returned a count. */
export function fireLanePoints20(scan: ForestIntegrityScanResponse | null): number | null {
  if (!scan) return null;
  const firmsConfigured = scan.providers.firms.status !== 'not_configured';
  const firmsCount = typeof scan.providers.firms.activeFires === 'number' ? scan.providers.firms.activeFires : null;
  if (!firmsConfigured || firmsCount == null) return null;
  return firmsCount === 0 ? 20 : clamp(20 - Math.min(20, firmsCount * 4), 0, 20);
}
