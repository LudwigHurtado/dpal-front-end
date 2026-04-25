import {
  API_ROUTES,
  CARB_AUDIT_DETAIL,
  CARB_AUDIT_EXPORT_DETAIL,
  CARB_AUDIT_LINK,
  CARB_AUDIT_RECALCULATE,
  apiUrl,
} from '../constants';
import { apiFetch } from '../auth/authApi';

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

export async function createCarbAudit(payload: unknown) {
  return requestJson<{ ok: true; auditId: string; audit: unknown }>(API_ROUTES.CARB_AUDIT_CREATE, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function listCarbAudits() {
  return requestJson<{ ok: true; audits: Array<{ id: string; facilityName: string; operatorName: string; riskLevel: string; discrepancyScore: number; updatedAt: string }> }>(API_ROUTES.CARB_AUDIT_LIST, {
    method: 'GET',
  });
}

export async function getCarbAudit(id: string) {
  return requestJson<{ ok: true; audit: any }>(CARB_AUDIT_DETAIL(id), { method: 'GET' });
}

export async function updateCarbAudit(id: string, payload: unknown) {
  return requestJson<{ ok: true; auditId: string; audit: unknown }>(CARB_AUDIT_DETAIL(id), {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function deleteCarbAudit(id: string) {
  return requestJson<{ ok: true; deleted: boolean }>(CARB_AUDIT_DETAIL(id), { method: 'DELETE' });
}

export async function exportCarbAudit(id: string) {
  return requestJson<{ ok: true; export: unknown }>(CARB_AUDIT_EXPORT_DETAIL(id), {
    method: 'POST',
    body: JSON.stringify({ format: 'json' }),
  });
}

export async function recalculateCarbAudit(id: string) {
  return requestJson<{ ok: true; auditId: string; audit: unknown }>(CARB_AUDIT_RECALCULATE(id), {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export async function linkCarbAudit(id: string, links: Record<string, unknown>) {
  return requestJson<{ ok: true; auditId: string }>(CARB_AUDIT_LINK(id), {
    method: 'POST',
    body: JSON.stringify(links),
  });
}

export async function searchCarbFacilities(params: Record<string, string>) {
  const qs = new URLSearchParams(params);
  return requestJson<{
    ok: true;
    results: any[];
    count: number;
    sourceMode: 'LIVE' | 'IMPORTED' | 'DEMO_FALLBACK';
    warnings: string[];
    datasetVersion?: string;
    retrievalDate?: string;
  }>(apiUrl(`${API_ROUTES.CARB_DATA_SEARCH}?${qs.toString()}`), { method: 'GET' });
}

export async function importCarbFacilities(payload: { records?: unknown[]; csvText?: string; jsonText?: string; datasetVersion?: string; sourceUrl?: string }) {
  return requestJson<{ ok: true; imported: number; acceptedRows: number; rejectedRows: number; missingRequiredFields: string[]; warnings: string[]; sourceMode: 'IMPORTED' | 'DEMO_FALLBACK' }>(
    API_ROUTES.CARB_DATA_IMPORT,
    { method: 'POST', body: JSON.stringify(payload) },
  );
}
