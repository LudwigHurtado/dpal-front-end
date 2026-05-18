import type { AgentContext, AgentFindingDraft, AgentRunResult } from '../types';

function copernicusConfigured(): boolean {
  return Boolean(
    process.env.COPERNICUS_CLIENT_ID?.trim() && process.env.COPERNICUS_CLIENT_SECRET?.trim(),
  );
}

function earthObservationLiveEnabled(): boolean {
  const raw = process.env.EARTH_OBSERVATION_LIVE_ENABLED?.trim().toLowerCase();
  return raw === 'true' || raw === '1';
}

export async function satelliteAgent(ctx: AgentContext): Promise<AgentRunResult> {
  const findings: AgentFindingDraft[] = [];
  const config = ctx.bundle.config;
  const location = (config?.location ?? {}) as Record<string, unknown> | undefined;
  const hasCoords =
    Boolean(String(location?.latitude ?? '').trim()) &&
    Boolean(String(location?.longitude ?? '').trim());

  const copernicus = copernicusConfigured();
  const earthObs = earthObservationLiveEnabled();

  if (!copernicus && !earthObs) {
    findings.push({
      severity: 'INFO',
      category: 'SATELLITE',
      title: 'Satellite provider check skipped',
      message:
        'Satellite provider check skipped because no live provider is configured (set COPERNICUS_CLIENT_ID/SECRET or EARTH_OBSERVATION_LIVE_ENABLED on the API host).',
      source: 'satelliteAgent',
      label: 'System Checked',
    });
    return { findings };
  }

  if (!hasCoords) {
    findings.push({
      severity: 'WARNING',
      category: 'SATELLITE',
      title: 'Satellite screening not runnable',
      message:
        'Live satellite adapters are configured on the server, but this project has no coordinates — imagery cannot be qualified for this AOI.',
      action: 'Add coordinates before requesting satellite comparison.',
      source: 'satelliteAgent',
      label: 'User Review Needed',
    });
    return { findings };
  }

  const providers: string[] = [];
  if (copernicus) providers.push('Copernicus Data Space (credentials present)');
  if (earthObs) providers.push('Earth Observation live mode enabled');

  findings.push({
    severity: 'INFO',
    category: 'SATELLITE',
    title: 'Satellite providers configured',
    message: `Configured providers: ${providers.join('; ')}. This agent does not run imagery search on scheduled ticks — use Earth Observation or AquaScan workflows for scene-level screening.`,
    source: 'satelliteAgent',
    label: 'System Checked',
  });

  const reportJson = ctx.bundle.dmrvReport?.reportJson as Record<string, unknown> | undefined;
  const satelliteHistory = reportJson?.satelliteReviewHistory;
  const historyCount = Array.isArray(satelliteHistory) ? satelliteHistory.length : 0;

  if (historyCount === 0) {
    findings.push({
      severity: 'INFO',
      category: 'SATELLITE',
      title: 'No qualified imagery in living report',
      message:
        'No qualified imagery found from configured providers in the persisted dMRV report history. Run a satellite review step in the workflow when ready.',
      source: 'satelliteAgent',
      label: 'AI Suggested',
    });
  } else {
    findings.push({
      severity: 'INFO',
      category: 'SATELLITE',
      title: 'Satellite review history present',
      message: `${historyCount} satellite review record(s) exist in the living report — verify dates and limitations before claims.`,
      source: 'satelliteAgent',
      label: 'System Checked',
    });
  }

  return { findings };
}
