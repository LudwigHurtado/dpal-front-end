import type { Report } from '../types';
import { parseBlockNumberInput } from './blockchainLookup';

/**
 * Keyword filter for public record / hub: title, description, report id, ledger ref, tx, hash, block number.
 */
export function reportMatchesKeywordFilter(report: Report, rawKeyword: string): boolean {
  const q = rawKeyword.toLowerCase().trim();
  if (!q) return true;

  const title = (report.title || '').toLowerCase();
  const description = (report.description || '').toLowerCase();
  if (title.includes(q) || description.includes(q)) return true;

  const id = (report.id || '').toLowerCase();
  if (id.includes(q)) return true;

  const bc = (report.blockchainRef || '').toLowerCase();
  const tx = (report.txHash || '').toLowerCase();
  const h = (report.hash || '').toLowerCase();
  if (bc.includes(q) || tx.includes(q) || h.includes(q)) return true;

  const qHex = q.replace(/^0x/i, '');
  if (qHex.length >= 4) {
    const strip = (s: string) => s.replace(/^0x/i, '');
    if (strip(bc).includes(qHex) || strip(tx).includes(qHex) || strip(h).includes(qHex)) return true;
  }

  const digitsOnly = q.replace(/,/g, '');
  if (report.blockNumber != null) {
    const parsed = parseBlockNumberInput(rawKeyword);
    if (parsed !== null && report.blockNumber === parsed) return true;
    if (String(report.blockNumber).includes(digitsOnly)) return true;
  }
  if (report.earnedNft?.blockNumber != null) {
    const parsed = parseBlockNumberInput(rawKeyword);
    if (parsed !== null && report.earnedNft.blockNumber === parsed) return true;
  }

  return false;
}
