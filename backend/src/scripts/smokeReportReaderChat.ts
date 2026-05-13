/**
 * Smoke: deterministic report reader (no HTTP server; no Gemini key required).
 * Run: npx tsx src/scripts/smokeReportReaderChat.ts
 */
import { buildDeterministicReportReader } from '../services/dpalReportReaderChatService';

const ctx = {
  pageType: 'evidence_audit',
  title: 'Demo packet',
  human_verified: false,
  blockchain_anchored: false,
  orchestration: {
    results: [
      {
        moduleKey: 'water',
        status: 'partial',
        headline: 'Water lanes partial',
        limitations: ['Scene-level only'],
        providerLanes: [
          { label: 'SMAP', state: 'ok' },
          { label: 'SWOT', state: 'unavailable', detail: 'no acquisition' },
        ],
      },
    ],
  },
};

const out = buildDeterministicReportReader(ctx, 'What providers were used and is this verified?', 'report_reader');
if (!out.answer.includes('What I cannot conclude')) {
  throw new Error('Expected answer to include cannot-conclude section');
}
if (!out.fallbackUsed) {
  throw new Error('Expected deterministic fallback');
}
console.log('[smokeReportReaderChat] ok', { modules: out.modulesReferenced, warnings: out.safetyWarnings.length });
