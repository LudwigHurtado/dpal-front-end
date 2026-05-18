import type { DeepOwlIconKey } from '../components/deepOwl/DeepOwlCategoryIcon';

/**
 * Planetary / Deep Owl intelligence service lines.
 * Each `href` targets the closest existing DPAL workspace (not a promise of full product scope).
 */
export type PlanetaryIntelligenceCategory = {
  id: string;
  title: string;
  icon: DeepOwlIconKey;
  /** react-router `to` pathname */
  href: string;
};

export const PLANETARY_INTELLIGENCE_CATEGORIES: PlanetaryIntelligenceCategory[] = [
  { id: 'carbon-credit-integrity', title: 'Carbon Credit Integrity Audits', icon: 'carbon', href: '/dmrv' },
  { id: 'greenwashing', title: 'Corporate Greenwashing Detection', icon: 'search', href: '/politician' },
  { id: 'methane', title: 'Methane Super-Emitter Monitoring', icon: 'methane', href: '/air' },
  { id: 'co2-facility', title: 'CO₂ Facility Verification', icon: 'factory', href: '/emissions-integrity-audit' },
  { id: 'hab', title: 'Harmful Algal Bloom Intelligence', icon: 'algae', href: '/water/aquascan' },
  { id: 'plastic', title: 'Plastic Pollution Watch', icon: 'plastic', href: '/hyperspectral-plastic-watch' },
  { id: 'blue-carbon', title: 'Blue Carbon DMRV', icon: 'ocean', href: '/ecology' },
  { id: 'forest-carbon', title: 'Forest Carbon & Deforestation Audit', icon: 'forest', href: '/forest-integrity' },
  { id: 'illegal-mining', title: 'Illegal Mining / Land Disturbance Watch', icon: 'mining', href: '/earth-observation' },
  { id: 'water-pollution', title: 'Water Pollution Evidence System', icon: 'water', href: '/water/aquascan' },
  { id: 'flood', title: 'Flood Risk & Damage Intelligence', icon: 'flood', href: '/floodguard' },
  { id: 'wildfire', title: 'Wildfire / Illegal Burn Monitoring', icon: 'flame', href: '/earth-observation' },
  { id: 'urban-heat', title: 'Urban Heat & Environmental Justice Dashboard', icon: 'heat', href: '/environmental-intelligence/envirofacts-map' },
  { id: 'industrial-air', title: 'Industrial Air Pollution Watch', icon: 'air', href: '/air' },
  { id: 'port-shipping', title: 'Port & Shipping Pollution Intelligence', icon: 'ship', href: '/global-signals' },
  { id: 'ag-mrv', title: 'Agriculture Carbon & Water Efficiency DMRV', icon: 'agriculture', href: '/afolu' },
  { id: 'drought-groundwater', title: 'Drought & Groundwater Risk Service', icon: 'drought', href: '/water' },
  { id: 'biodiversity', title: 'Biodiversity & Habitat Integrity Monitoring', icon: 'biodiversity', href: '/ecology' },
  { id: 'infrastructure', title: 'Infrastructure Risk & Subsidence Monitoring', icon: 'infrastructure', href: '/earth-observation' },
  { id: 'dam-reservoir', title: 'Dam / Reservoir / River Integrity Monitor', icon: 'dam', href: '/water/monitor' },
  { id: 'insurance-risk', title: 'Insurance Environmental Risk Scoring', icon: 'insurance', href: '/global-signals' },
  { id: 'real-estate-dd', title: 'Real Estate / Land Due Diligence', icon: 'land', href: '/locator' },
  { id: 'hazardous-waste', title: 'Hazardous Waste Integrity Audit', icon: 'waste', href: '/hazardous-waste-audit' },
  { id: 'supplier-watch', title: 'Corporate Supplier Environmental Watch', icon: 'supply-chain', href: '/impact' },
  { id: 'gov-transparency', title: 'Government Transparency Dashboard', icon: 'government', href: '/transparency-db' },
  { id: 'community-reporting', title: 'Community Environmental Reporting Platform', icon: 'community', href: '/hub' },
  { id: 'litigation', title: 'Environmental Litigation Support', icon: 'legal', href: '/situation-room' },
  { id: 'investor-climate', title: 'Investor Climate Risk Intelligence', icon: 'investor', href: '/offsets' },
  { id: 'municipal-resilience', title: 'Municipal Climate Resilience Planning', icon: 'city', href: '/environmental-intelligence' },
  { id: 'vius', title: 'DPAL Verified Impact Units / VIUs', icon: 'verified', href: '/carbon-hub' },
];
