/**
 * DPAL Help Center — frontend API client.
 * Sends tickets to the Express + Prisma + Supabase backend.
 */

import { getApiBase } from '../constants';
import { apiFetch } from '../auth/authApi';

export interface HelpReportPayload {
  category:               string;
  subcategory?:           string;
  tags?:                  string[];
  title:                  string;
  description:            string;
  urgency?:               'low' | 'normal' | 'high' | 'urgent' | 'emergency';
  source?:                string;
  isAnonymous?:           boolean;
  needsImmediateResponse?: boolean;
  language?:              string;
  occurredAt?:            string;
  contact?: {
    fullName?:               string;
    phone?:                  string;
    email?:                  string;
    preferredContactMethod?: string;
    safeToCall?:             boolean;
    safeToText?:             boolean;
  };
  location?: {
    country?:       string;
    stateRegion?:   string;
    city?:          string;
    address?:       string;
    latitude?:      number;
    longitude?:     number;
    locationNotes?: string;
  };
}

export interface SubmitResult {
  ok:           boolean;
  reportId?:    string;
  reportNumber?: string;
  isDuplicate?: boolean;
  error?:       string;
}

export interface HelpTicketRecord {
  id: string;
  reportNumber: string;
  category: string;
  title: string;
  description?: string;
  status: string;
  urgency: string;
  createdAt: string;
  updatedAt: string;
  attachments?: Array<{ id: string }>;
}

/**
 * Submit a new help report to the backend.
 * Returns the report ID and report number for tracking.
 */
export async function submitHelpReport(
  payload: HelpReportPayload,
  authToken?: string,
): Promise<SubmitResult> {
  const base = getApiBase().replace(/\/$/, '');

  try {
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

    const res = await fetch(`${base}/api/help-reports`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15_000),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      return {
        ok:    false,
        error: (data as any)?.error ?? `Server error ${res.status}`,
      };
    }

    return {
      ok:           true,
      reportId:     (data as any).reportId,
      reportNumber: (data as any).reportNumber,
      isDuplicate:  (data as any).isDuplicate,
    };
  } catch (err: any) {
    return {
      ok:    false,
      error: err?.message ?? 'Network error — please try again',
    };
  }
}

/**
 * Fetch the reporter's own tickets (requires auth token).
 */
export async function getMyTickets() {
  try {
    const res = await apiFetch('/api/help-reports/mine', { method: 'GET', signal: AbortSignal.timeout(10_000) }, true);
    if (!res.ok) {
      if (res.status === 401) return { ok: false, reports: [] as HelpTicketRecord[], authRequired: true };
      return { ok: false, reports: [] as HelpTicketRecord[] };
    }
    const data = await res.json();
    return { ok: true, reports: ((data as any).reports ?? []) as HelpTicketRecord[] };
  } catch {
    return { ok: false, reports: [] as HelpTicketRecord[] };
  }
}

/**
 * Upload attachments for a help report.
 */
export async function uploadHelpReportAttachments(reportId: string, files: File[]) {
  if (!reportId || files.length === 0) return { ok: true, uploaded: 0 };
  try {
    const form = new FormData();
    for (const file of files) form.append('files', file);
    const res = await apiFetch(`/api/help-reports/${encodeURIComponent(reportId)}/attachments`, { method: 'POST', body: form }, true);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return { ok: false, error: (data as any)?.error ?? `Upload failed (${res.status})`, uploaded: 0 };
    }
    const data = await res.json().catch(() => ({}));
    const attachments = ((data as any)?.attachments ?? []) as unknown[];
    return { ok: true, uploaded: attachments.length };
  } catch (err: any) {
    return { ok: false, error: err?.message ?? 'Attachment upload failed', uploaded: 0 };
  }
}
