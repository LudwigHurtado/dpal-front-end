/**
 * Planetary / Deep Owl intelligence service lines — title-only launcher tiles on the platform home.
 * Each `href` targets the closest existing DPAL workspace (not a promise of full product scope).
 */
export type PlanetaryIntelligenceCategory = {
  id: string;
  title: string;
  /** react-router `to` pathname */
  href: string;
};

export const PLANETARY_INTELLIGENCE_CATEGORIES: PlanetaryIntelligenceCategory[] = [
  { id: 'carbon-credit-integrity', title: 'Carbon Credit Integrity Audits', href: '/carbon-compliance' },
  { id: 'greenwashing', title: 'Corporate Greenwashing Detection', href: '/politician' },
  { id: 'methane', title: 'Methane Super-Emitter Monitoring', href: '/air' },
  { id: 'co2-facility', title: 'CO₂ Facility Verification', href: '/emissions-integrity-audit' },
  { id: 'hab', title: 'Harmful Algal Bloom Intelligence', href: '/water/aquascan' },
  { id: 'plastic', title: 'Plastic Pollution Watch', href: '/hyperspectral-plastic-watch' },
  { id: 'blue-carbon', title: 'Blue Carbon MRV', href: '/ecology' },
  { id: 'forest-carbon', title: 'Forest Carbon & Deforestation Audit', href: '/forest-integrity' },
  { id: 'illegal-mining', title: 'Illegal Mining / Land Disturbance Watch', href: '/earth-observation' },
  { id: 'water-pollution', title: 'Water Pollution Evidence System', href: '/water/aquascan' },
  { id: 'flood', title: 'Flood Risk & Damage Intelligence', href: '/floodguard' },
  { id: 'wildfire', title: 'Wildfire / Illegal Burn Monitoring', href: '/earth-observation' },
  { id: 'urban-heat', title: 'Urban Heat & Environmental Justice Dashboard', href: '/environmental-intelligence/envirofacts-map' },
  { id: 'industrial-air', title: 'Industrial Air Pollution Watch', href: '/air' },
  { id: 'port-shipping', title: 'Port & Shipping Pollution Intelligence', href: '/global-signals' },
  { id: 'ag-mrv', title: 'Agriculture Carbon & Water Efficiency MRV', href: '/afolu' },
  { id: 'drought-groundwater', title: 'Drought & Groundwater Risk Service', href: '/water' },
  { id: 'biodiversity', title: 'Biodiversity & Habitat Integrity Monitoring', href: '/ecology' },
  { id: 'infrastructure', title: 'Infrastructure Risk & Subsidence Monitoring', href: '/earth-observation' },
  { id: 'dam-reservoir', title: 'Dam / Reservoir / River Integrity Monitor', href: '/water/monitor' },
  { id: 'insurance-risk', title: 'Insurance Environmental Risk Scoring', href: '/global-signals' },
  { id: 'real-estate-dd', title: 'Real Estate / Land Due Diligence', href: '/locator' },
  { id: 'hazardous-waste', title: 'Hazardous Waste Integrity Audit', href: '/hazardous-waste-audit' },
  { id: 'supplier-watch', title: 'Corporate Supplier Environmental Watch', href: '/impact' },
  { id: 'gov-transparency', title: 'Government Transparency Dashboard', href: '/transparency-db' },
  { id: 'community-reporting', title: 'Community Environmental Reporting Platform', href: '/hub' },
  { id: 'litigation', title: 'Environmental Litigation Support', href: '/situation-room' },
  { id: 'investor-climate', title: 'Investor Climate Risk Intelligence', href: '/offsets' },
  { id: 'municipal-resilience', title: 'Municipal Climate Resilience Planning', href: '/environmental-intelligence' },
  { id: 'vius', title: 'DPAL Verified Impact Units / VIUs', href: '/carbon-hub' },
];
