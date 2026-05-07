/**
 * Ledger anchor placeholder — swap for real DPAL chain service when available.
 */

import { createHash } from 'crypto';

export interface LedgerAnchorResult {
  ledgerRecordId: string;
  contentHash: string;
  anchoredAt: string;
}

export function anchorEvidenceOnLedger(contentHash: string, alertId: string): LedgerAnchorResult {
  const mix = createHash('sha256').update(`${contentHash}:${alertId}`).digest('hex');
  return {
    contentHash,
    ledgerRecordId: `dpal-flood-ledger-${mix.slice(0, 12)}`,
    anchoredAt: new Date().toISOString(),
  };
}
