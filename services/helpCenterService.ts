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

const HELP_LOCAL_TICKETS_KEY = 'dpal_help_local_tickets_v1';

function readLocalHelpTickets(): HelpTicketRecord[] {
  try {
    const raw = localStorage.getItem(HELP_LOCAL_TICKETS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as HelpTicketRecord[]) : [];
  } catch {
    return [];
  }
}

function writeLocalHelpTickets(tickets: HelpTicketRecord[]) {
  try {
    localStorage.setItem(HELP_LOCAL_TICKETS_KEY, JSON.stringify(tickets.slice(0, 100)));
  } catch {
    /* ignore */
  }
}

function appendLocalHelpTicket(ticket: HelpTicketRecord) {
  const prev = readLocalHelpTickets();
  const dedup = prev.filter((t) => t.id !== ticket.id);
  writeLocalHelpTickets([ticket, ...dedup]);
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
  const nowIso = new Date().toISOString();
  const saveLocalShadow = (id: string, reportNumber: string, status = 'submitted') => {
    appendLocalHelpTicket({
      id,
      reportNumber,
      category: payload.category,
      title: payload.title,
      description: payload.description,
      status,
      urgency: payload.urgency ?? 'normal',
      createdAt: nowIso,
      updatedAt: nowIso,
    });
  };

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
      // Fallback for deployments without /api/help-reports:
      // persist as a standard report so it is still stored server-side.
      const shouldFallback = res.status === 404 || res.status === 405 || res.status >= 500;
      if (!shouldFallback) {
        return {
          ok: false,
          error: (data as any)?.error ?? `Server error ${res.status}`,
        };
      }
      const fallbackId = `rep-help-${Date.now()}`;
      const fallbackBody = {
        id: fallbackId,
        title: payload.title,
        description: payload.description,
        category: payload.category || 'dpal_help',
        status: 'Submitted',
        severity: payload.urgency === 'urgent' || payload.urgency === 'emergency' ? 'Critical' : 'Standard',
        isActionable: true,
        location: payload.location?.city || payload.location?.address || 'Unknown',
        timestamp: nowIso,
      };
      try {
        const fallbackRes = await fetch(`${base}/api/reports`, {
          method: 'POST',
          headers,
          body: JSON.stringify(fallbackBody),
          signal: AbortSignal.timeout(15_000),
        });
        if (!fallbackRes.ok) {
          return {
            ok: false,
            error: (data as any)?.error ?? `Server error ${res.status}`,
          };
        }
        const syntheticNumber = `HELP-${Date.now()}`;
        saveLocalShadow(fallbackId, syntheticNumber);
        return { ok: true, reportId: fallbackId, reportNumber: syntheticNumber };
      } catch {
        return {
          ok: false,
          error: (data as any)?.error ?? `Server error ${res.status}`,
        };
      }
    }

    const reportId = (data as any).reportId;
    const reportNumber = (data as any).reportNumber;
    if (typeof reportId === 'string' && typeof reportNumber === 'string') {
      saveLocalShadow(reportId, reportNumber, String((data as any).status || 'submitted').toLowerCase());
    }
    return {
      ok:           true,
      reportId,
      reportNumber,
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
  const local = readLocalHelpTickets();
  try {
    const res = await apiFetch('/api/help-reports/mine', { method: 'GET', signal: AbortSignal.timeout(10_000) }, true);
    if (!res.ok) {
      if (res.status === 401) return { ok: false, reports: local, authRequired: true };
      return { ok: false, reports: local };
    }
    const data = await res.json();
    const remote = ((data as any).reports ?? []) as HelpTicketRecord[];
    const merged = [...remote];
    for (const lt of local) {
      if (!merged.some((rt) => rt.id === lt.id)) merged.push(lt);
    }
    return { ok: true, reports: merged };
  } catch {
    return { ok: false, reports: local };
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
