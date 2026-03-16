import { getApiBase } from '../constants';

export interface EvidenceUploadItem {
  filename: string;
  mimeType: string;
  sizeBytes: number;
  sha256: string;
  timestampIso: string;
}

export interface EvidenceRecord extends EvidenceUploadItem {
  evidenceRefId: string;
  timestampHash: string;
  chainRefId: string;
  verificationLink: string;
}

export interface EvidencePacket {
  ok: boolean;
  reportId: string;
  generatedAt: string;
  packetHash: string;
  verificationBaseUrl: string;
  records: EvidenceRecord[];
}

export async function createEvidenceRecords(reportId: string, items: EvidenceUploadItem[]): Promise<EvidenceRecord[]> {
  if (!items.length) return [];
  const apiBase = getApiBase();
  const response = await fetch(`${apiBase}/api/reports/${encodeURIComponent(reportId)}/evidence`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items }),
  });

  if (!response.ok) throw new Error(`Evidence vault creation failed: ${response.status}`);

  const data = await response.json();
  return data?.records || [];
}

export async function fetchEvidencePacket(reportId: string): Promise<EvidencePacket> {
  const apiBase = getApiBase();
  const response = await fetch(`${apiBase}/api/reports/${encodeURIComponent(reportId)}/evidence/packet`);

  if (!response.ok) throw new Error(`Evidence packet fetch failed: ${response.status}`);

  return response.json();
}
