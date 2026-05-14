import type { ProviderAdapter, ProviderRunInput, ProviderRunResult } from '../sources/providerAdapters';
import { PROVIDER_RUN_SAFETY } from '../sources/providerAdapters';

const SOURCE_ID = 'QR_EVIDENCE' as const;

function isEvidenceRef(x: unknown): x is { label?: string; hash?: string; url?: string; type?: string } {
  return x != null && typeof x === 'object';
}

export const qrEvidenceAdapter: ProviderAdapter = {
  sourceId: SOURCE_ID,
  canRun() {
    return true;
  },
  async run(input: ProviderRunInput): Promise<ProviderRunResult> {
    const lim = [
      'QR-linked evidence describes submitted artifacts only — does not imply blockchain anchoring unless an anchor record is attached.',
    ];
    const refs = Array.isArray(input.evidenceRefs) ? input.evidenceRefs.filter(isEvidenceRef) : [];
    const substantive = refs.filter((r) => (r.hash && String(r.hash).trim()) || (r.url && String(r.url).trim()) || (r.label && String(r.label).trim()));
    if (substantive.length === 0) {
      return {
        sourceId: SOURCE_ID,
        status: 'partial',
        signals: [{ key: 'qr_links', label: 'Submitted evidence references', value: 0, confidence: 'low' }],
        limitations: [...lim, 'No QR evidence submitted for this run.'],
        safetyLabels: PROVIDER_RUN_SAFETY,
      };
    }
    return {
      sourceId: SOURCE_ID,
      status: 'success',
      signals: [{ key: 'qr_links', label: 'Submitted evidence references', value: substantive.length, confidence: 'requires_validation' }],
      evidenceRefs: substantive.slice(0, 20).map((r, i) => ({
        type: String(r.type ?? 'qr_evidence'),
        label: String(r.label ?? r.hash ?? r.url ?? `ref-${i}`),
        url: r.url,
        hash: r.hash ? String(r.hash) : undefined,
        metadata: { projectId: input.projectId ?? null, roomId: input.roomId ?? null },
      })),
      limitations: lim,
      safetyLabels: PROVIDER_RUN_SAFETY,
    };
  },
};
