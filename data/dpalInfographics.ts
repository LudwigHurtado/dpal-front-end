/** Curated DPAL one-pagers for sharing (served from `/public/dpal-infographics/`). */
export type DpalInfographicGroup = 'environmental' | 'platform' | 'programs';

export type DpalInfographicItem = {
  id: string;
  title: string;
  group: DpalInfographicGroup;
  /** Path under site root */
  imageSrc: string;
  shortLabel: string;
};

export const DPAL_INFOGRAPHIC_CATEGORY = 'DPAL shareable maps';

export const DPAL_INFOGRAPHIC_GROUPS: Record<DpalInfographicGroup, { label: string; description: string }> = {
  environmental: {
    label: 'Environmental intelligence',
    description: 'Water, land, emissions, and scan workflows.',
  },
  platform: {
    label: 'Platform & compliance',
    description: 'Accountability, evidence, APIs, and standards context.',
  },
  programs: {
    label: 'Programs & marketplace',
    description: 'Missions, mobility, gaming, and investor-facing summaries.',
  },
};

export const DPAL_INFOGRAPHICS: DpalInfographicItem[] = [
  {
    id: 'participation-action-impact',
    title: 'Participation, Action & Verified Impact',
    group: 'platform',
    imageSrc: '/dpal-infographics/participation-action-impact.png',
    shortLabel: 'Participation → impact',
  },
  {
    id: 'environmental-scan-suite',
    title: 'Environmental Scan Suite',
    group: 'environmental',
    imageSrc: '/dpal-infographics/environmental-scan-suite.png',
    shortLabel: 'Scan suite overview',
  },
  {
    id: 'technology-ecosystem',
    title: 'DPAL Technology Ecosystem',
    group: 'platform',
    imageSrc: '/dpal-infographics/technology-ecosystem.png',
    shortLabel: 'Tech ecosystem',
  },
  {
    id: 'earth-observation',
    title: 'DPAL Earth Observation',
    group: 'environmental',
    imageSrc: '/dpal-infographics/earth-observation.png',
    shortLabel: 'Earth Observation',
  },
  {
    id: 'carb-air-monitor-audit',
    title: 'DPAL CARB Air Monitor Audit',
    group: 'environmental',
    imageSrc: '/dpal-infographics/carb-air-monitor-audit.png',
    shortLabel: 'CARB audit',
  },
  {
    id: 'aquascan-mrv',
    title: 'DPAL AquaScan DMRV',
    group: 'environmental',
    imageSrc: '/dpal-infographics/aquascan-mrv.png',
    shortLabel: 'AquaScan DMRV',
  },
  {
    id: 'gaming-nft-revenue',
    title: 'DPAL Gaming & NFT Revenue',
    group: 'programs',
    imageSrc: '/dpal-infographics/gaming-nft-revenue.png',
    shortLabel: 'Gaming & NFT',
  },
  {
    id: 'small-verified-actions',
    title: 'Small Verified Actions, Massive Climate Impact',
    group: 'platform',
    imageSrc: '/dpal-infographics/small-verified-actions.png',
    shortLabel: 'Verified actions',
  },
  {
    id: 'verra-gold-standard',
    title: 'How DPAL Is Like Verra & Gold Standard',
    group: 'platform',
    imageSrc: '/dpal-infographics/verra-gold-standard.png',
    shortLabel: 'Verra & Gold Standard',
  },
  {
    id: 'market-clients',
    title: 'DPAL Market & Clients',
    group: 'programs',
    imageSrc: '/dpal-infographics/market-clients.png',
    shortLabel: 'Market & clients',
  },
  {
    id: 'deepowl-coin',
    title: 'DPAL / DeepOwl Coin Investor Ecosystem',
    group: 'programs',
    imageSrc: '/dpal-infographics/deepowl-coin.png',
    shortLabel: 'DPAL coin ecosystem',
  },
  {
    id: 'legal-evidence-case-services',
    title: 'DPAL Legal Evidence & Case Support',
    group: 'platform',
    imageSrc: '/dpal-infographics/legal-evidence-case-services.png',
    shortLabel: 'Legal evidence',
  },
  {
    id: 'good-wheels-mobility',
    title: 'DPAL Good Wheels & Community Mobility',
    group: 'programs',
    imageSrc: '/dpal-infographics/good-wheels-mobility.png',
    shortLabel: 'Good Wheels',
  },
  {
    id: 'missions-community-response',
    title: 'DPAL Mission Marketplace & Community Response',
    group: 'programs',
    imageSrc: '/dpal-infographics/missions-community-response.png',
    shortLabel: 'Missions marketplace',
  },
  {
    id: 'carbon-viu-mrv',
    title: 'DPAL Carbon, VIU & DMRV Services',
    group: 'environmental',
    imageSrc: '/dpal-infographics/carbon-viu-mrv.png',
    shortLabel: 'Carbon & VIU DMRV',
  },
  {
    id: 'public-accountability-library',
    title: 'DPAL Public Accountability Library',
    group: 'platform',
    imageSrc: '/dpal-infographics/public-accountability-library.png',
    shortLabel: 'Accountability library',
  },
  {
    id: 'enterprise-api-white-label',
    title: 'DPAL Enterprise API, Data & White-Label Services',
    group: 'platform',
    imageSrc: '/dpal-infographics/enterprise-api-white-label.png',
    shortLabel: 'Enterprise API',
  },
  {
    id: 'environmental-scan-services',
    title: 'DPAL Environmental Intelligence & Scan Services',
    group: 'environmental',
    imageSrc: '/dpal-infographics/environmental-scan-services.png',
    shortLabel: 'EI scan services',
  },
];
