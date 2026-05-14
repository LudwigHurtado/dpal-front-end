import type { ProviderRunResult } from './providerAdapters';

/** Aligns with Command Center `evidenceRefs` / provider lane style (id + label + optional href). */
export type EvidenceLane = {
  id: string;
  label: string;
  href?: string;
  state?: string;
  detail?: string;
  sourceId?: string;
};

export function normalizeProviderResultToEvidenceLane(result: ProviderRunResult): EvidenceLane[] {
  const lanes: EvidenceLane[] = [
    {
      id: `${result.sourceId}-status`,
      label: `${result.sourceId} · ${result.status}`,
      detail: result.limitations.length ? result.limitations.join(' | ') : undefined,
      sourceId: result.sourceId,
      state: result.status,
    },
  ];
  for (const s of result.signals) {
    lanes.push({
      id: `${result.sourceId}-signal-${s.key}`,
      label: `${s.label}: ${String(s.value)}`,
      detail: s.confidence,
      sourceId: result.sourceId,
    });
  }
  const refs = result.evidenceRefs ?? [];
  refs.forEach((e, i) => {
    lanes.push({
      id: `${result.sourceId}-ref-${i}`,
      label: e.label,
      href: e.url,
      detail: e.type,
      sourceId: result.sourceId,
    });
  });
  return lanes;
}
