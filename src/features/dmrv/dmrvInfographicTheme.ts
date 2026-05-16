/** Shared infographic palette — eight segment colors used across all DMRV families. */
export const DMRV_SEGMENT_COLORS = [
  '#4A7C44',
  '#7A8B3A',
  '#C4883A',
  '#8B6914',
  '#2A9D8F',
  '#4A86CF',
  '#C53030',
  '#705196',
] as const;

export const DMRV_FOOTER_TAGLINES: Record<string, string> = {
  'carbon-land': 'carbon and land intelligence',
  'water-blue-carbon': 'water and blue-carbon intelligence',
  'pollution-emissions': 'pollution and emissions intelligence',
  'biodiversity-ecosystems': 'biodiversity and ecosystem intelligence',
  'climate-risk-disaster': 'climate risk and disaster intelligence',
  'urban-energy-infrastructure': 'urban, energy, and infrastructure intelligence',
  'supply-chain-corporate-claims': 'supply-chain and corporate-claims intelligence',
  'community-public-accountability': 'community accountability intelligence',
  'custom-advanced-intelligence': 'custom and advanced intelligence',
};

export function segmentColorForIndex(index: number): string {
  return DMRV_SEGMENT_COLORS[index % DMRV_SEGMENT_COLORS.length] ?? DMRV_SEGMENT_COLORS[0];
}
