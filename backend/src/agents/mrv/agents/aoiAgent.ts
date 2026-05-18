import type { AgentContext, AgentFindingDraft, AgentRunResult } from '../types';

function parseCoord(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const n = typeof value === 'number' ? value : parseFloat(String(value).trim());
  return Number.isFinite(n) ? n : null;
}

export async function aoiAgent(ctx: AgentContext): Promise<AgentRunResult> {
  const findings: AgentFindingDraft[] = [];
  const config = ctx.bundle.config;
  if (!config) {
    findings.push({
      severity: 'INFO',
      category: 'AOI',
      title: 'AOI check skipped',
      message: 'AOI validation requires a synced project configuration snapshot.',
      source: 'aoiAgent',
      label: 'System Checked',
    });
    return { findings };
  }

  const location = (config.location ?? {}) as Record<string, unknown>;
  const lat = parseCoord(location.latitude);
  const lng = parseCoord(location.longitude);
  const aoiSummary = String(location.aoiSummary ?? '').trim();
  const aoiGeoJson = String(location.aoiGeoJson ?? '').trim();
  const coordValidation = String(location.coordinateValidation ?? 'pending');

  if (lat === null || lng === null) {
    findings.push({
      severity: 'WARNING',
      category: 'AOI',
      title: 'Coordinates missing',
      message: 'Latitude and longitude are not set. Satellite screening and zonal metrics require a focus location.',
      action: 'Set coordinates or draw an AOI on the project map.',
      source: 'aoiAgent',
      label: 'User Review Needed',
    });
  } else if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    findings.push({
      severity: 'CRITICAL',
      category: 'AOI',
      title: 'Invalid coordinates',
      message: `Coordinates (${lat}, ${lng}) are out of valid range.`,
      action: 'Correct latitude/longitude before running satellite checks.',
      source: 'aoiAgent',
      label: 'User Review Needed',
    });
  } else {
    findings.push({
      severity: 'INFO',
      category: 'AOI',
      title: 'Focus coordinates present',
      message: `System checked focus point at ${lat.toFixed(5)}, ${lng.toFixed(5)}.`,
      source: 'aoiAgent',
      label: 'System Checked',
    });
  }

  if (!aoiSummary && !aoiGeoJson) {
    findings.push({
      severity: 'WARNING',
      category: 'AOI',
      title: 'AOI boundary not defined',
      message: 'No AOI summary or stored polygon/GeoJSON was found in the project snapshot.',
      action: 'Draw or upload an AOI boundary in Project Configuration.',
      source: 'aoiAgent',
      label: 'User Review Needed',
    });
  } else if (aoiGeoJson) {
    findings.push({
      severity: 'INFO',
      category: 'AOI',
      title: 'AOI geometry stored',
      message: aoiSummary
        ? `AOI summary: ${aoiSummary}`
        : 'AOI GeoJSON or polygon vertices are stored for this project.',
      source: 'aoiAgent',
      label: 'System Checked',
    });
  }

  if (coordValidation === 'invalid') {
    findings.push({
      severity: 'CRITICAL',
      category: 'AOI',
      title: 'Coordinate validation failed',
      message: 'The project snapshot marks coordinate validation as invalid.',
      source: 'aoiAgent',
      label: 'User Review Needed',
    });
  }

  return { findings };
}
