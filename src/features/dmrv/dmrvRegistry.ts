import { DMRV_FAMILIES, type DmrvFamilyDef, type DmrvTypeDef } from './dmrvCatalog';
import { DMRV_INFOGRAPHIC_TYPES, type InfographicTypeSeed } from './dmrvInfographicTypes';
import { segmentColorForIndex } from './dmrvInfographicTheme';

export type DmrvConnectorStatus = 'live' | 'planned';

export type DmrvConnectorMeta = {
  id: string;
  label: string;
  status: DmrvConnectorStatus;
  dataType: string;
  category: 'satellite' | 'public_record' | 'field' | 'sensor' | 'blockchain' | 'validator' | 'legal';
  integrationNote: string;
  /** Existing DPAL view id when live */
  routeView?: string;
  /** In-app pathname when live */
  routePath?: string;
  externalKey?: 'validator_portal';
};

export type DmrvType = {
  id: string;
  title: string;
  /** Short label for the selector dial legend */
  selectorLabel: string;
  description: string;
  /** Infographic input chips (up to five shown in the board) */
  inputExamples: string[];
  /** Evaluation metrics shown on the right of each row */
  evaluationMetrics: string[];
  segmentColor: string;
  inputs: string[];
  connectors: string[];
  dataLayers: string[];
  riskFlags: string[];
  workflow: string[];
};

export type DmrvCategory = {
  slug: string;
  title: string;
  subtitle: string;
  image: string;
  color: string;
  description: string;
  types: DmrvType[];
};

export const DMRV_WORKFLOW_STEPS = [
  'Select category',
  'Select DMRV type',
  'Select location / AOI',
  'Load satellite and public data',
  'Upload field evidence',
  'Run AI risk evaluation',
  'Generate evidence packet',
  'Validator review',
  'Blockchain timestamp',
  'Final report / QR evidence page',
] as const;

export const CONNECTOR_CATALOG: Record<string, DmrvConnectorMeta> = {
  'nasa-gibs': {
    id: 'nasa-gibs',
    label: 'NASA GIBS',
    status: 'live',
    dataType: 'Global imagery & MODIS/VIIRS layers',
    category: 'satellite',
    integrationNote: 'Use Earth Observation and global signal layers for screening.',
    routeView: 'earthObservation',
  },
  'nasa-pace': {
    id: 'nasa-pace',
    label: 'NASA PACE',
    status: 'live',
    dataType: 'Ocean color / hyperspectral metadata',
    category: 'satellite',
    integrationNote: 'PACE metadata surfaces in Plastic Watch workflows.',
    routeView: 'hyperspectralPlasticWatch',
  },
  'nasa-firms': {
    id: 'nasa-firms',
    label: 'NASA FIRMS',
    status: 'planned',
    dataType: 'Active fire detections',
    category: 'satellite',
    integrationNote: 'Fire hotspot layer — configure FIRMS key on API host when enabled.',
    routeView: 'earthObservation',
  },
  'nasa-hls': {
    id: 'nasa-hls',
    label: 'NASA HLS',
    status: 'planned',
    dataType: 'Harmonized Landsat–Sentinel surface reflectance',
    category: 'satellite',
    integrationNote: 'Harmonized time series for land change screening.',
    routeView: 'earthObservation',
  },
  landsat: {
    id: 'landsat',
    label: 'Landsat',
    status: 'live',
    dataType: 'Landsat 8/9 scene statistics',
    category: 'satellite',
    integrationNote: 'Ecology and Earth Observation adapters on configured API host.',
    routeView: 'ecologicalConservation',
  },
  'sentinel-copernicus': {
    id: 'sentinel-copernicus',
    label: 'Sentinel / Copernicus',
    status: 'live',
    dataType: 'Sentinel-1/2 statistical comparisons',
    category: 'satellite',
    integrationNote: 'Copernicus proxy routes power AquaScan before/after panels.',
    routePath: '/water/aquascan',
  },
  'planetary-computer': {
    id: 'planetary-computer',
    label: 'Microsoft Planetary Computer',
    status: 'live',
    dataType: 'STAC catalogs & item statistics',
    category: 'satellite',
    integrationNote: 'Backend Earth Observation scan uses PC STAC when deployed.',
    routeView: 'earthObservation',
  },
  'epa-envirofacts': {
    id: 'epa-envirofacts',
    label: 'EPA Envirofacts',
    status: 'live',
    dataType: 'Facility & release inventories',
    category: 'public_record',
    integrationNote: 'Envirofacts Geo Intelligence dashboard.',
    routeView: 'envirofactsGeoIntelligence',
  },
  'epa-echo': {
    id: 'epa-echo',
    label: 'EPA ECHO',
    status: 'planned',
    dataType: 'Compliance & enforcement records',
    category: 'public_record',
    integrationNote: 'ECHO integration planned — use Envirofacts for facility context today.',
  },
  'carb-data': {
    id: 'carb-data',
    label: 'CARB data',
    status: 'live',
    dataType: 'Official California inventory reads',
    category: 'public_record',
    integrationNote: 'CARB emissions audit workspace with dataset mode labels.',
    routeView: 'carbEmissionsAudit',
  },
  'usgs-water': {
    id: 'usgs-water',
    label: 'USGS Water Data',
    status: 'live',
    dataType: 'Gauges, streams, and hydrology context',
    category: 'public_record',
    integrationNote: 'Water Monitor and AquaScan when API host exposes /api/water/*.',
    routeView: 'waterMonitor',
  },
  'noaa-nws': {
    id: 'noaa-nws',
    label: 'NOAA / NWS',
    status: 'live',
    dataType: 'Weather, flood, and hydromet context',
    category: 'public_record',
    integrationNote: 'FloodGuard civic intelligence — not a substitute for official alerts.',
    routeView: 'floodGuard',
  },
  'osm-overpass': {
    id: 'osm-overpass',
    label: 'OpenStreetMap / Overpass',
    status: 'planned',
    dataType: 'Infrastructure & land-use vectors',
    category: 'public_record',
    integrationNote: 'OSM overlays planned for urban and infrastructure DMRV.',
  },
  'field-reports': {
    id: 'field-reports',
    label: 'Field reports',
    status: 'live',
    dataType: 'Community & operator submissions',
    category: 'field',
    integrationNote: 'File through DPAL hub and category reporting flows.',
    routeView: 'hub',
  },
  'drone-upload': {
    id: 'drone-upload',
    label: 'Drone upload',
    status: 'planned',
    dataType: 'High-resolution aerial capture',
    category: 'field',
    integrationNote: 'Attach drone media in evidence packet and situation room uploads.',
    routeView: 'situationRoom',
  },
  'iot-sensors': {
    id: 'iot-sensors',
    label: 'IoT sensors',
    status: 'planned',
    dataType: 'Continuous monitoring feeds',
    category: 'sensor',
    integrationNote: 'Sensor adapters vary by project — mark as planned until wired.',
  },
  'qr-evidence': {
    id: 'qr-evidence',
    label: 'QR evidence pages',
    status: 'live',
    dataType: 'Public verification surfaces',
    category: 'field',
    integrationNote: 'Public verification routes (e.g. FloodGuard verify, water public records).',
    routePath: '/floodguard',
  },
  'blockchain-log': {
    id: 'blockchain-log',
    label: 'Blockchain evidence log',
    status: 'live',
    dataType: 'Content hash & audit trail',
    category: 'blockchain',
    integrationNote: 'Transparency database and ledger lookup — mock chain where noted in UI.',
    routeView: 'transparencyDatabase',
  },
  'validator-portal': {
    id: 'validator-portal',
    label: 'Validator review portal',
    status: 'live',
    dataType: 'Expert / community review queue',
    category: 'validator',
    integrationNote: 'Opens Reviewer Node portal when VITE_VALIDATOR_PORTAL_URL is configured.',
    externalKey: 'validator_portal',
  },
  'legal-packet': {
    id: 'legal-packet',
    label: 'Legal evidence packet builder',
    status: 'live',
    dataType: 'Structured findings & safe claim language',
    category: 'legal',
    integrationNote: 'Evidence packet preview and situation room handoff.',
    routeView: 'previewEvidencePacket',
  },
  climatiq: {
    id: 'climatiq',
    label: 'Climatiq emission factors',
    status: 'live',
    dataType: 'Activity × factor estimates',
    category: 'public_record',
    integrationNote: 'Server-proxied /api/climatiq/* — key stays on backend.',
    routeView: 'climatiqCalculator',
  },
};

const FAMILY_CONNECTORS: Record<string, string[]> = {
  'carbon-land': ['landsat', 'planetary-computer', 'nasa-hls', 'nasa-gibs', 'field-reports', 'validator-portal', 'legal-packet', 'blockchain-log'],
  'water-blue-carbon': ['sentinel-copernicus', 'usgs-water', 'noaa-nws', 'nasa-pace', 'planetary-computer', 'field-reports', 'qr-evidence', 'legal-packet'],
  'pollution-emissions': ['epa-envirofacts', 'carb-data', 'climatiq', 'landsat', 'field-reports', 'validator-portal', 'legal-packet'],
  'biodiversity-ecosystems': ['landsat', 'planetary-computer', 'nasa-gibs', 'field-reports', 'legal-packet'],
  'climate-risk-disaster': ['noaa-nws', 'nasa-firms', 'nasa-gibs', 'planetary-computer', 'field-reports', 'qr-evidence', 'blockchain-log'],
  'urban-energy-infrastructure': ['landsat', 'sentinel-copernicus', 'osm-overpass', 'epa-envirofacts', 'climatiq', 'field-reports'],
  'supply-chain-claims': [
    'climatiq',
    'epa-envirofacts',
    'landsat',
    'planetary-computer',
    'field-reports',
    'validator-portal',
    'legal-packet',
    'blockchain-log',
  ],
  'community-accountability': ['field-reports', 'qr-evidence', 'validator-portal', 'legal-packet', 'blockchain-log'],
  'custom-intelligence': ['planetary-computer', 'drone-upload', 'iot-sensors', 'blockchain-log', 'validator-portal', 'legal-packet'],
};

const CATALOG_ID_TO_SLUG: Record<string, string> = {
  'carbon-land': 'carbon-land',
  'water-blue-carbon': 'water-blue-carbon',
  'pollution-emissions': 'pollution-emissions',
  'biodiversity-ecosystems': 'biodiversity-ecosystems',
  'climate-risk-disaster': 'climate-risk-disaster',
  'urban-energy-infrastructure': 'urban-energy-infrastructure',
  'supply-chain-claims': 'supply-chain-corporate-claims',
  'community-accountability': 'community-public-accountability',
  'custom-intelligence': 'custom-advanced-intelligence',
};

const CATEGORY_META: Record<
  string,
  { title?: string; subtitle: string; image: string; description: string }
> = {
  'carbon-land': {
    title: 'Carbon & Land',
    subtitle: 'Land-based carbon intelligence. Nature-based verification. Tailored to carbon and land projects.',
    image: '/assets/dmrv/carbon-land-dmrv.png',
    description:
      'Land-based carbon intelligence, nature-based verification, and carbon project integrity.',
  },
  'water-blue-carbon': {
    title: 'Water & Blue Carbon',
    subtitle: 'Water intelligence. Blue-carbon verification. Tailored to aquatic and hydrologic systems.',
    image: '/assets/dmrv/water-blue-carbon-dmrv.png',
    description:
      'Aquatic intelligence for wetlands, watersheds, oceans, flooding, drought, and water quality.',
  },
  'pollution-emissions': {
    title: 'Pollution & Emissions',
    subtitle: 'Pollution intelligence. Emissions verification. Tailored to compliance and environmental accountability.',
    image: '/assets/dmrv/pollution-emissions-dmrv.png',
    description:
      'Facility emissions, air quality, methane, waste, toxic exposure, and compliance verification.',
  },
  'biodiversity-ecosystems': {
    title: 'Biodiversity & Ecosystems',
    subtitle: 'Ecosystem intelligence. Habitat verification. Tailored to biodiversity and restoration outcomes.',
    image: '/assets/dmrv/biodiversity-ecosystems-dmrv.png',
    description:
      'Habitat, species, restoration, protected areas, nature-positive claims, and ecosystem condition.',
  },
  'climate-risk-disaster': {
    title: 'Climate Risk & Disaster',
    subtitle: 'Risk intelligence. Resilience verification. Tailored to hazards, adaptation, and recovery.',
    image: '/assets/dmrv/climate-risk-disaster-dmrv.png',
    description:
      'Wildfire, heat, flood, disaster recovery, infrastructure risk, and resilience verification.',
  },
  'urban-energy-infrastructure': {
    title: 'Urban, Energy & Infrastructure',
    subtitle: 'City intelligence. Clean-infrastructure verification. Tailored to built environments and public works.',
    image: '/assets/dmrv/urban-energy-infrastructure-dmrv.png',
    description:
      'Smart city, renewable energy, clean mobility, public works, and building efficiency verification.',
  },
  'supply-chain-corporate-claims': {
    title: 'Supply Chain, Traceability & Corporate Claims',
    subtitle: 'Traceability intelligence. Corporate-claims verification. Tailored to supply chains and disclosures.',
    image: '/assets/dmrv/supply-chain-corporate-claims-dmrv.png',
    description:
      'Corporate ESG claims, greenwashing detection, offset integrity, commodity sourcing, and traceability.',
  },
  'community-public-accountability': {
    title: 'Community, Justice & Public Accountability',
    subtitle:
      'Community intelligence. Public verification. Tailored to harm reporting, justice, and accountability.',
    image: '/assets/dmrv/community-public-accountability-dmrv.png',
    description:
      'Citizen reports, environmental justice, public health, school and housing conditions, QR evidence sites.',
  },
  'custom-advanced-intelligence': {
    title: 'Custom & Advanced Intelligence',
    subtitle:
      'Flexible intelligence. Verifiable evidence. Tailored to advanced workflows and future-ready systems.',
    image: '/assets/dmrv/custom-advanced-intelligence-dmrv.png',
    description:
      'AI anomaly detection, blockchain evidence, validator review, IoT, drones, satellite fusion, legal packets.',
  },
};

function mapTypeFromInfographic(
  seed: InfographicTypeSeed,
  index: number,
  catalogType: DmrvTypeDef | undefined,
  familyConnectorIds: string[],
): DmrvType {
  const profile = catalogType?.profile;
  const inputs = [
    ...new Set([
      ...seed.inputExamples,
      ...(profile?.requiredInputs ?? []),
      ...(profile?.optionalInputs ?? []),
    ]),
  ];
  const dataLayers = [
    ...new Set([...(profile?.satelliteLayers ?? []), ...seed.evaluationFocus]),
  ];
  return {
    id: seed.id,
    title: seed.label,
    selectorLabel: seed.selectorLabel,
    description: seed.description,
    inputExamples: seed.inputExamples,
    evaluationMetrics: seed.evaluationFocus,
    segmentColor: segmentColorForIndex(index),
    inputs,
    connectors: familyConnectorIds,
    dataLayers,
    riskFlags: profile?.riskFlags ?? [],
    workflow: [...DMRV_WORKFLOW_STEPS],
  };
}

function mapFamily(family: DmrvFamilyDef): DmrvCategory {
  const slug = CATALOG_ID_TO_SLUG[family.id] ?? family.id;
  const meta = CATEGORY_META[slug];
  const connectorIds = (FAMILY_CONNECTORS[family.id] ?? []).filter((id) => CONNECTOR_CATALOG[id]);
  const infographicSeeds = DMRV_INFOGRAPHIC_TYPES[family.id];
  const types = infographicSeeds.map((seed, index) => {
    const catalogType = family.types.find((t) => t.id === seed.id);
    return mapTypeFromInfographic(seed, index, catalogType, connectorIds);
  });
  return {
    slug,
    title: meta?.title ?? family.title,
    subtitle: meta?.subtitle ?? family.description,
    image: meta?.image ?? `/assets/dmrv/${slug}-dmrv.png`,
    color: family.hex,
    description: meta?.description ?? family.description,
    types,
  };
}

export const DMRV_CATEGORIES: DmrvCategory[] = DMRV_FAMILIES.map(mapFamily);

export function getCategoryBySlug(slug: string | undefined): DmrvCategory | undefined {
  if (!slug) return undefined;
  const normalized = slug.replace(/\/$/, '');
  return DMRV_CATEGORIES.find((c) => c.slug === normalized);
}

export function getConnector(id: string): DmrvConnectorMeta | undefined {
  return CONNECTOR_CATALOG[id];
}

export function getTypeForCategory(categorySlug: string, typeId: string): DmrvType | undefined {
  return getCategoryBySlug(categorySlug)?.types.find((t) => t.id === typeId);
}

export const DMRV_HUB_SUBTITLE =
  'One platform. Many environments. Evidence-based monitoring, reporting, verification, and accountability.';

/** Data-layer proof copy for the data source panel */
export function dataLayerProof(layer: string): { proves: string; supports: string; kind: string } {
  const lower = layer.toLowerCase();
  if (lower.includes('satellite') || lower.includes('ndvi') || lower.includes('imagery') || lower.includes('landsat')) {
    return {
      proves: 'Surface condition and change screening for the AOI.',
      supports: 'Satellite DMRV — scene-level unless zonal stats are configured.',
      kind: 'Satellite',
    };
  }
  if (lower.includes('sensor') || lower.includes('iot') || lower.includes('gauge')) {
    return {
      proves: 'Time-series readings or alerts at a point or facility.',
      supports: 'Sensor DMRV — requires calibration and provenance metadata.',
      kind: 'Sensor',
    };
  }
  if (lower.includes('public') || lower.includes('epa') || lower.includes('carb') || lower.includes('inventory')) {
    return {
      proves: 'Official or regulatory context for facilities and releases.',
      supports: 'Public record DMRV — cite dataset mode and reporting year.',
      kind: 'Public record',
    };
  }
  if (lower.includes('blockchain') || lower.includes('hash') || lower.includes('ledger')) {
    return {
      proves: 'Immutable timestamp and content fingerprint of the evidence packet.',
      supports: 'Blockchain evidence — distinguish mock ledger from public chain when labeled.',
      kind: 'Blockchain evidence',
    };
  }
  return {
    proves: 'Field or operator-submitted context that satellites cannot alone verify.',
    supports: 'Field evidence DMRV — validator review recommended.',
    kind: 'Field evidence',
  };
}
