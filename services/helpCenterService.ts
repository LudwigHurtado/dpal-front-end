/**
 * DPAL Help Center — frontend API client.
 * Sends tickets to the Express + Prisma + Supabase backend.
 */

import { getApiBase } from '../constants';

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
export async function getMyTickets(authToken: string) {
  const base = getApiBase().replace(/\/$/, '');
  try {
    const res = await fetch(`${base}/api/help-reports/mine`, {
      headers: { Authorization: `Bearer ${authToken}` },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return { ok: false, reports: [] };
    const data = await res.json();
    return { ok: true, reports: (data as any).reports ?? [] };
  } catch {
    return { ok: false, reports: [] };
  }
}
