import { getApiBase } from '../constants';

export type TokenAction =
  | 'STAKE_VERIFY'
  | 'UNLOCK_TOOL'
  | 'SPONSOR_MISSION'
  | 'REWARD_WHISTLEBLOWER'
  | 'GOVERNANCE_VOTE';

export interface TokenUtilityRecord {
  _id: string;
  actor: string;
  action: TokenAction;
  amount: number;
  referenceId?: string;
  notes?: string;
  txHash: string;
  blockNumber: number;
  chain: string;
  createdAt: string;
}

const apiBase = getApiBase();

export async function fetchTokenRecords(limit = 80): Promise<TokenUtilityRecord[]> {
  const res = await fetch(`${apiBase}/api/token/records?limit=${limit}`);
  if (!res.ok) throw new Error(`Failed token records fetch (${res.status})`);
  const data = await res.json();
  return Array.isArray(data?.records) ? data.records : [];
}

export async function createTokenRecord(payload: {
  actor: string;
  action: TokenAction;
  amount: number;
  referenceId?: string;
  notes?: string;
}): Promise<TokenUtilityRecord> {
  const res = await fetch(`${apiBase}/api/token/records`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Failed token record create (${res.status})`);
  const data = await res.json();
  return data?.record;
}
