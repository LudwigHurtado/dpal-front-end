import { getApiBase, apiUrl, API_ROUTES } from '../constants';

const apiBase = getApiBase();

export async function fetchOpsConfidence() {
  const res = await fetch(`${apiBase}/api/ops/confidence`);
  if (!res.ok) throw new Error(`ops_confidence_failed_${res.status}`);
  return res.json();
}

export async function fetchTransparencyMetrics() {
  const res = await fetch(`${apiBase}/api/public/transparency/metrics`);
  if (!res.ok) throw new Error(`transparency_metrics_failed_${res.status}`);
  return res.json();
}

export async function computeVerifierScore(payload: Record<string, number>) {
  const res = await fetch(`${apiBase}/api/verifier/score`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`verifier_score_failed_${res.status}`);
  return res.json();
}

/** Escrow create payload: saved for future use / blockchain. Receipts and faceImage as base64 data URLs. */
export interface EscrowCreatePayload {
  payerName: string;
  payerEmail?: string;
  payeeName: string;
  payeeEmail?: string;
  amount: number;
  currency: string;
  description: string;
  receiptImages: string[];
  faceImage: string;
}

export interface EscrowRecord {
  id: string;
  payerName: string;
  payeeName: string;
  amount: number;
  currency: string;
  description: string;
  status: 'pending' | 'released' | 'refunded' | 'disputed';
  createdAt: string;
  receiptCount?: number;
  hasFaceVerification?: boolean;
}

const ESCROW_LOCAL_KEY = 'dpal-escrows-local';

function getLocalEscrows(): EscrowRecord[] {
  try {
    const raw = localStorage.getItem(ESCROW_LOCAL_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveLocalEscrow(record: EscrowRecord): void {
  const list = getLocalEscrows();
  list.unshift(record);
  localStorage.setItem(ESCROW_LOCAL_KEY, JSON.stringify(list));
}

export async function createEscrow(payload: EscrowCreatePayload): Promise<EscrowRecord> {
  try {
    const res = await fetch(apiUrl(API_ROUTES.ESCROW_CREATE), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) return res.json();
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `escrow_create_failed_${res.status}`);
  } catch (e) {
    if (e instanceof Error && (e.message.includes('404') || e.message.includes('Failed to fetch') || e.message.includes('NetworkError'))) {
      const record: EscrowRecord = {
        id: `esc-local-${Date.now()}`,
        payerName: payload.payerName,
        payeeName: payload.payeeName,
        amount: payload.amount,
        currency: payload.currency,
        description: payload.description,
        status: 'pending',
        createdAt: new Date().toISOString(),
        receiptCount: payload.receiptImages?.length ?? 0,
        hasFaceVerification: Boolean(payload.faceImage),
      };
      saveLocalEscrow(record);
      return record;
    }
    throw e;
  }
}

export async function listEscrows(): Promise<EscrowRecord[]> {
  try {
    const res = await fetch(apiUrl(API_ROUTES.ESCROW_LIST));
    if (!res.ok) throw new Error(`escrow_list_failed_${res.status}`);
    const data = await res.json();
    return Array.isArray(data) ? data : data.items || data.escrows || [];
  } catch {
    return getLocalEscrows();
  }
}
