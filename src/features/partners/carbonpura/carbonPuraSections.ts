export type CarbonPuraSectionId =
  | 'overview'
  | 'live-engines'
  | 'water-plastic'
  | 'pace-products'
  | 'evidence-chain'
  | 'provider-matrix'
  | 'compliance'
  | 'verification';

export type CarbonPuraSectionDef = {
  id: CarbonPuraSectionId;
  label: string;
  anchorId: string;
  /** Shown in sticky nav for executive (compact) mode */
  executiveNav: boolean;
};

export const CARBONPURA_SECTIONS: CarbonPuraSectionDef[] = [
  { id: 'overview', label: 'Overview', anchorId: 'carbonpura-section-overview', executiveNav: true },
  { id: 'live-engines', label: 'Live Engines', anchorId: 'carbonpura-section-live-engines', executiveNav: true },
  { id: 'water-plastic', label: 'Water + Plastic', anchorId: 'carbonpura-section-water-plastic', executiveNav: false },
  { id: 'pace-products', label: 'PACE Products', anchorId: 'carbonpura-section-pace-products', executiveNav: false },
  { id: 'evidence-chain', label: 'Evidence Chain', anchorId: 'carbonpura-section-evidence-chain', executiveNav: true },
  { id: 'provider-matrix', label: 'Provider Matrix', anchorId: 'carbonpura-section-provider-matrix', executiveNav: false },
  { id: 'compliance', label: 'Compliance', anchorId: 'carbonpura-section-compliance', executiveNav: false },
  { id: 'verification', label: 'Verification', anchorId: 'carbonpura-section-verification', executiveNav: false },
];

export function carbonPuraSectionAnchor(id: CarbonPuraSectionId): string {
  return CARBONPURA_SECTIONS.find((s) => s.id === id)?.anchorId ?? `carbonpura-section-${id}`;
}
