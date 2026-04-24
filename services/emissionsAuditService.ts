import {
  API_ROUTES,
  EMISSIONS_AUDIT_DETAIL,
  EMISSIONS_AUDIT_EXPORT_DETAIL,
  EMISSIONS_AUDIT_LINK,
  EMISSIONS_AUDIT_RECALCULATE,
} from '../constants';
import { apiFetch } from '../auth/authApi';
import type { EvidencePacket } from '../src/features/emissionsIntegrity/types/emissionsIntegrity.types';

async function parseJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(text || 'Invalid server response');
  }
}

async function requestJson<T>(url: string, init: RequestInit): Promise<T> {
  const response = await apiFetch(url, init, true);
  const data = await parseJson<T & { error?: string; message?: string }>(response);
  if (!response.ok) {
    throw new Error((data as { message?: string; error?: string }).message || (data as { error?: string }).error || `HTTP ${response.status}`);
  }
  return data;
}

export interface EmissionsAuditDraftPayload {
  companyName: string;
  facilityName: string;
  industry: string;
  jurisdiction: string;
  legalFramework: string;
  location: {
    lat?: number | null;
    lng?: number | null;
    polygonGeoJSON?: unknown;
    areaEstimate?: number | null;
  };
  baselinePeriod: {
    startDate: string;
    endDate: string;
    label: string;
  };
  currentPeriod: {
    startDate: string;
    endDate: string;
    label: string;
  };
  reportedData?: {
    baselineCO2e: number;
    currentCO2e: number;
    sourceMetadata: unknown;
  } | null;
  satelliteData?: {
    baselineMethaneScore: number;
    currentMethaneScore: number;
    baselineNO2Score: number;
    currentNO2Score: number;
    baselineActivityProxyScore?: number;
    currentActivityProxyScore?: number;
    co2ContextScore?: number;
    sourceMetadata: unknown;
  } | null;
  productionData?: {
    baselineOutput: number;
    currentOutput: number;
    outputUnit: string;
    sourceMetadata: unknown;
  } | null;
  confidence: {
    satelliteConfidence: number;
    regulatoryConfidence: number;
    weatherQAConfidence: number;
    overallConfidence?: number;
  };
  legalContext: string[];
  limitations: string[];
  recommendedNextSteps: string[];
  linkedReportId?: string | null;
  linkedMissionId?: string | null;
  linkedProjectId?: string | null;
  linkedMRVProjectId?: string | null;
  linkedEvidenceVaultId?: string | null;
  ledgerStatus?: string;
  evidencePacket?: unknown;
  version?: number;
}

export interface EmissionsAuditSummary {
  id: string;
  companyName: string;
  facilityName: string;
  jurisdiction: string;
  adiScore: number;
  riskLevel: string;
  createdAt: string;
  updatedAt: string;
  linkedReportId?: string | null;
  linkedMissionId?: string | null;
  linkedProjectId?: string | null;
}

export async function createEmissionsAudit(payload: EmissionsAuditDraftPayload) {
  return requestJson<{ ok: true; auditId: string; audit: unknown }>(API_ROUTES.EMISSIONS_AUDIT_CREATE, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function listEmissionsAudits() {
  return requestJson<{ ok: true; audits: EmissionsAuditSummary[] }>(API_ROUTES.EMISSIONS_AUDIT_LIST, {
    method: 'GET',
  });
}

export async function getEmissionsAudit(id: string) {
  return requestJson<{ ok: true; audit: any; versionHistory: Array<{ version: number; modifiedBy: string; changeSummary?: string | null; createdAt: string }> }>(EMISSIONS_AUDIT_DETAIL(id), {
    method: 'GET',
  });
}

export async function updateEmissionsAudit(id: string, payload: EmissionsAuditDraftPayload) {
  return requestJson<{ ok: true; auditId: string; audit: unknown }>(EMISSIONS_AUDIT_DETAIL(id), {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function deleteEmissionsAudit(id: string) {
  return requestJson<{ ok: true; deleted: boolean; auditId: string }>(EMISSIONS_AUDIT_DETAIL(id), {
    method: 'DELETE',
  });
}

export async function exportEmissionsAudit(id: string) {
  return requestJson<{ ok: true; export: EvidencePacket; pdfPlaceholder: unknown; evidenceBundle: unknown }>(EMISSIONS_AUDIT_EXPORT_DETAIL(id), {
    method: 'POST',
    body: JSON.stringify({ format: 'json' }),
  });
}

export async function linkEmissionsAudit(id: string, links: {
  linkedReportId?: string | null;
  linkedMissionId?: string | null;
  linkedProjectId?: string | null;
  linkedMRVProjectId?: string | null;
  linkedEvidenceVaultId?: string | null;
}) {
  return requestJson<{ ok: true; auditId: string; links: unknown }>(EMISSIONS_AUDIT_LINK(id), {
    method: 'POST',
    body: JSON.stringify(links),
  });
}

export async function recalculateEmissionsAudit(id: string) {
  return requestJson<{ ok: true; auditId: string; audit: unknown }>(EMISSIONS_AUDIT_RECALCULATE(id), {
    method: 'POST',
    body: JSON.stringify({}),
  });
}
