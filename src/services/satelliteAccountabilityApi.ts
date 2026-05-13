import { API_ROUTES, apiUrl } from '../../constants';
import { normalizeSignalsFromModules } from '../features/environmentalIntelligence/accountability/accountabilityAdapterRegistry';
import { ACCOUNTABILITY_CROSS_MODULE_EXAMPLES } from '../features/environmentalIntelligence/accountability/crossModuleSignalExamples';
import { getAccountabilityProviderStatus } from '../features/environmentalIntelligence/accountability/providerStatusAggregator';
import type { AccountabilityModuleSignal, AccountabilityModuleStatus } from '../features/environmentalIntelligence/shared/accountabilityModuleAdapters';
import { getModuleStatusLabel } from '../features/environmentalIntelligence/shared/accountabilityModuleAdapters';
import type {
  DisclosureClaimType,
  DisclosureIntegrityFinding,
  ObservedEnvironmentalSignal,
  ProviderReadinessSnapshot,
} from '../features/environmentalIntelligence/shared/disclosureIntegrityTypes';

export type SatelliteAccountabilityAnalyzeMode = 'preview' | 'partial' | 'live';

export type AnalyzeDisclosureIntegrityInput = {
  companyName: string;
  facilityName?: string;
  claimType: DisclosureClaimType;
  claimText: string;
  lat?: number;
  lng?: number;
  radiusKm?: number;
  aoiGeoJson?: unknown;
  reportingPeriod?: string;
  selectedProviders: string[];
};

export type AnalyzeDisclosureIntegrityResponse = {
  ok: boolean;
  mode?: SatelliteAccountabilityAnalyzeMode;
  providerStatus?: Record<string, { status: string; detail: string }>;
  finding?: DisclosureIntegrityFinding;
  warnings?: string[];
  disclaimer?: string;
};

export type EvidencePacketResponse = {
  ok: boolean;
  finding?: DisclosureIntegrityFinding;
  shellMessage?: string;
  disclaimer?: string;
};

export type SatelliteAccountabilityProviderStatusResponse = {
  ok: boolean;
  mode?: string;
  lanes?: Array<{ id: string; status: string; detail: string }>;
  providerSummary?: ProviderReadinessSnapshot;
  providers?: Array<{ id: string; label: string; group: string; status: string; displayLabel: string; legalCaution: string }>;
  warnings?: string[];
};

export type ModuleStatusRow = {
  moduleId: string;
  label: string;
  status: string;
  statusLabel?: string;
  route?: string;
  contributes: string;
  supportedClaimTypes: string[];
  supportedSignalTypes: string[];
  limitations: string[];
  warnings: string[];
};

export type ConnectedModuleStatusResult = {
  ok: boolean;
  modules: ModuleStatusRow[];
  notice?: string;
};

async function safeJson<T>(res: Response): Promise<T | null> {
  try {
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export async function analyzeDisclosureIntegrity(
  input: AnalyzeDisclosureIntegrityInput,
): Promise<AnalyzeDisclosureIntegrityResponse> {
  try {
    const res = await fetch(apiUrl(API_ROUTES.SATELLITE_ACCOUNTABILITY_ANALYZE), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    const data = await safeJson<AnalyzeDisclosureIntegrityResponse>(res);
    if (!res.ok || !data) return { ok: false };
    return data;
  } catch {
    return { ok: false };
  }
}

export async function buildDisclosureIntegrityEvidencePacket(input: {
  finding: DisclosureIntegrityFinding;
}): Promise<EvidencePacketResponse> {
  try {
    const res = await fetch(apiUrl(API_ROUTES.SATELLITE_ACCOUNTABILITY_EVIDENCE_PACKET), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    const data = await safeJson<EvidencePacketResponse>(res);
    if (!res.ok || !data) return { ok: false };
    return data;
  } catch {
    return { ok: false };
  }
}

export async function getSatelliteAccountabilityProviderStatus(): Promise<SatelliteAccountabilityProviderStatusResponse> {
  try {
    const res = await fetch(apiUrl(API_ROUTES.SATELLITE_ACCOUNTABILITY_PROVIDER_STATUS), { method: 'GET' });
    const data = await safeJson<SatelliteAccountabilityProviderStatusResponse>(res);
    if (!res.ok || !data) return { ok: false };
    return data;
  } catch {
    return { ok: false };
  }
}

export async function getConnectedModuleStatus(): Promise<ConnectedModuleStatusResult> {
  try {
    const res = await fetch(apiUrl(API_ROUTES.SATELLITE_ACCOUNTABILITY_MODULE_STATUS), { method: 'GET' });
    const data = await safeJson<{ ok: boolean; modules?: ModuleStatusRow[] }>(res);
    if (res.ok && data?.ok && Array.isArray(data.modules)) {
      return {
        ok: true,
        modules: data.modules.map((m) => ({
          ...m,
          statusLabel: getModuleStatusLabel(m.status as AccountabilityModuleStatus),
        })),
      };
    }
  } catch {
    /* registry fallback */
  }
  const fb = getAccountabilityProviderStatus(null);
  return {
    ok: true,
    modules: fb.modules.map((m) => ({
      ...m,
      statusLabel: m.statusLabel ?? getModuleStatusLabel(m.status as AccountabilityModuleStatus),
    })),
    notice: fb.notice,
  };
}

export function getCrossModuleSignalPreview(): ReadonlyArray<(typeof ACCOUNTABILITY_CROSS_MODULE_EXAMPLES)[number]> {
  return ACCOUNTABILITY_CROSS_MODULE_EXAMPLES;
}

export async function normalizeModuleSignalsForFinding(input: {
  moduleSignals: AccountabilityModuleSignal[];
  disclosureClaim?: unknown;
}): Promise<{
  ok: boolean;
  observedSignals: ObservedEnvironmentalSignal[];
  warnings: string[];
  disclaimer?: string;
  notice?: string;
}> {
  try {
    const res = await fetch(apiUrl(API_ROUTES.SATELLITE_ACCOUNTABILITY_NORMALIZE_SIGNALS), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    const data = await safeJson<{
      ok: boolean;
      observedSignals?: ObservedEnvironmentalSignal[];
      warnings?: string[];
      disclaimer?: string;
    }>(res);
    if (res.ok && data?.ok && Array.isArray(data.observedSignals)) {
      return {
        ok: true,
        observedSignals: data.observedSignals,
        warnings: data.warnings ?? [],
        disclaimer: data.disclaimer,
      };
    }
  } catch {
    /* fallback */
  }
  return {
    ok: true,
    observedSignals: normalizeSignalsFromModules(input.moduleSignals),
    warnings: ['Registry-based normalization — POST /api/satellite-accountability/normalize-signals unavailable or returned non-OK.'],
    disclaimer:
      'Normalized signals are adapter summaries for reviewer transparency — not fabricated live satellite products.',
    notice: 'Live provider/module status unavailable — displaying registry-based preview.',
  };
}
