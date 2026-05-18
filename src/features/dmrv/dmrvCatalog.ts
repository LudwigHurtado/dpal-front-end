/** DPAL Adaptive DMRV Engine — families, types, profiles, and workflow steps. */

export type DmrvFamilyId =
  | 'carbon-land'
  | 'water-blue-carbon'
  | 'pollution-emissions'
  | 'biodiversity-ecosystems'
  | 'climate-risk-disaster'
  | 'urban-energy-infrastructure'
  | 'supply-chain-claims'
  | 'community-accountability'
  | 'custom-intelligence';

export type DmrvProfile = {
  purpose: string;
  requiredInputs: string[];
  optionalInputs: string[];
  satelliteLayers: string[];
  groundTruthRequirements: string[];
  aiEvaluationRules: string[];
  riskFlags: string[];
  evidencePacket: string[];
  validatorReview: string[];
  blockchainRecord: string[];
  finalReport: string[];
};

export type DmrvTypeDef = {
  id: string;
  label: string;
  description: string;
  profile: DmrvProfile;
  /** Example evaluation input chips (infographic-style). */
  inputExamples: string[];
  evaluationFocus: string[];
};

export type DmrvFamilyDef = {
  id: DmrvFamilyId;
  title: string;
  cardLabel: string;
  description: string;
  hex: string;
  types: DmrvTypeDef[];
};

export const DMRV_WORKFLOW_STEPS = [
  { id: 1, label: 'Define Project / Location', detail: 'AOI, jurisdiction, reporting period, and claim scope.' },
  { id: 2, label: 'Select Evidence Inputs', detail: 'Required vs optional inputs for this DMRV type.' },
  { id: 3, label: 'Load Satellite & Public Data', detail: 'Catalog pulls, public records, and configured adapters.' },
  { id: 4, label: 'Upload Field Evidence', detail: 'Plots, photos, sensor exports, and operator attestations.' },
  { id: 5, label: 'Run AI / Risk Evaluation', detail: 'Screening, anomaly flags, and confidence scoring — human gates remain.' },
  { id: 6, label: 'Generate Evidence Packet', detail: 'Maps, tables, findings, and safe claim language.' },
  { id: 7, label: 'Validator Review', detail: 'Expert or community reviewer decision log.' },
  { id: 8, label: 'Blockchain Timestamp', detail: 'Evidence hash, audit trail, and public verification record.' },
  { id: 9, label: 'Final Report / Dashboard', detail: 'Investor-ready summary with limitations disclosed.' },
] as const;

export const DPAL_ENGINE_TREE = [
  {
    title: 'Adaptive DMRV Engine',
    children: [
      'Carbon & Land',
      'Water & Blue Carbon',
      'Pollution & Emissions',
      'Biodiversity & Ecosystems',
      'Climate Risk & Disaster',
      'Urban / Energy / Infrastructure',
      'Supply Chain & Corporate Claims',
      'Community Accountability',
      'Custom Intelligence',
    ],
  },
  {
    title: 'Evidence Intelligence Layer',
    children: [
      'Satellite data',
      'Sensor data',
      'Field reports',
      'Public records',
      'Company disclosures',
      'Community evidence',
      'Validator review',
    ],
  },
  {
    title: 'AI Risk & Verification Layer',
    children: [
      'Anomaly detection',
      'Claim comparison',
      'Confidence scoring',
      'Fraud / greenwashing flags',
      'Missing-evidence detection',
      'Escalation recommendations',
    ],
  },
  {
    title: 'Blockchain Accountability Layer',
    children: [
      'Evidence hash',
      'Timestamp',
      'QR evidence page',
      'Audit trail',
      'Chain of custody',
      'Public verification record',
    ],
  },
  {
    title: 'Validator Portal',
    children: [
      'Expert review',
      'Community verification',
      'Agency escalation',
      'Decision log',
      'Final validation status',
    ],
  },
  {
    title: 'Evidence Packet Builder',
    children: [
      'Maps',
      'Satellite screenshots',
      'Input tables',
      'Risk findings',
      'AI explanation',
      'Validator notes',
      'Blockchain proof',
      'PDF / QR report',
    ],
  },
  {
    title: 'Public Accountability Library',
    children: [
      'Searchable records',
      'Project pages',
      'Company profiles',
      'Facility profiles',
      'Community reports',
      'Environmental alerts',
      'Verified impact records',
    ],
  },
] as const;

function profile(
  purpose: string,
  overrides: Partial<DmrvProfile> = {},
): DmrvProfile {
  const base: DmrvProfile = {
    purpose,
    requiredInputs: ['Project / facility identity', 'Geographic AOI or facility coordinates', 'Reporting period'],
    optionalInputs: ['Historical baseline', 'Management practice records', 'Third-party attestations'],
    satelliteLayers: ['Optical land cover', 'Vegetation indices where applicable', 'Public catalog metadata'],
    groundTruthRequirements: ['Field plot or sample design when claiming biophysical change', 'Source trail for activity data'],
    aiEvaluationRules: [
      'Compare stated claims to available evidence categories',
      'Flag missing required inputs before scoring',
      'Use cautious language when adapters are partial or demo',
    ],
    riskFlags: ['Missing coordinates', 'Short observation window', 'Unverified activity data', 'Conflicting public records'],
    evidencePacket: ['AOI map', 'Input inventory', 'Screening summary', 'Limitations block', 'Validator checklist'],
    validatorReview: ['Scope confirmation', 'Evidence sufficiency', 'Approve / request more / escalate'],
    blockchainRecord: ['Content hash of evidence packet', 'Timestamp', 'Public verification link when deployed'],
    finalReport: ['Executive summary', 'What was reviewed', 'What was not proven', 'Recommended next actions'],
  };
  return { ...base, ...overrides };
}

function type(
  id: string,
  label: string,
  description: string,
  inputExamples: string[],
  evaluationFocus: string[],
  profileOverrides: Partial<DmrvProfile> & { purpose: string },
): DmrvTypeDef {
  return {
    id,
    label,
    description,
    inputExamples,
    evaluationFocus,
    profile: profile(profileOverrides.purpose, profileOverrides),
  };
}

export const DMRV_FAMILIES: DmrvFamilyDef[] = [
  {
    id: 'carbon-land',
    title: 'Carbon & Land',
    cardLabel: 'Carbon & Land',
    description: 'Forest, agriculture, grassland, AFOLU, and land-carbon DMRV pathways.',
    hex: '#4A7C44',
    types: [
      type('forest-land-use', 'Forest / Land Use', 'Forest carbon stocks, deforestation, degradation, regrowth, and enhancement.', ['Satellite', 'Field Plots', 'LiDAR', 'Biomass Data', 'Activity Data'], ['Land cover change', 'Deforestation alerts', 'Carbon stock trend'], { purpose: 'Monitor forest carbon stocks and land-cover integrity for DMRV screening.', requiredInputs: ['AOI polygon', 'Forest baseline period', 'Activity / management records'], satelliteLayers: ['Forest cover', 'NDVI / NBR', 'Deforestation alert layers'], groundTruthRequirements: ['Plot biomass or inventory when claiming stock change'] }),
      type('agriculture', 'Agriculture', 'Soil carbon, N₂O/CH₄, and management practice impacts.', ['Soil Samples', 'IoT / Sensors', 'Management Data', 'Weather Data', 'Activity Data'], ['Soil organic carbon', 'Practice verification', 'Emission factors'], { purpose: 'Track agricultural soil carbon and practice-linked emissions for DMRV.', requiredInputs: ['Farm / field boundary', 'Crop & practice history', 'Soil sampling plan or proxy'], optionalInputs: ['Yield records', 'Fertilizer application logs'] }),
      type('grassland-savanna', 'Grassland / Savanna', 'Soil carbon, biomass, grazing, and fire management outcomes.', ['Satellite', 'Fire Data', 'Grazing Data', 'Soil Samples', 'Weather Data'], ['Fire regime', 'Grazing intensity', 'Biomass dynamics'], { purpose: 'Assess grassland carbon and disturbance regimes for land-based DMRV.' }),
      type('afolu-land-carbon', 'AFOLU / Land Carbon', 'Investor-facing land-use carbon projects, missions, and proof workflows.', ['Project boundary', 'Mission proof', 'DMRV score inputs', 'Satellite screening'], ['Project readiness', 'Proof completeness', 'Validator queue'], { purpose: 'Coordinate AFOLU project proof, missions, and carbon readiness — often local-first until synced.' }),
      type('soil-carbon', 'Soil Carbon & Land Management', 'Soil organic carbon trends under land-management scenarios.', ['Soil Samples', 'Management Data', 'Satellite', 'Weather Data'], ['SOC trend', 'Management attribution'], { purpose: 'Evaluate soil organic carbon claims tied to explicit management actions.' }),
      type('reforestation', 'Reforestation / Restoration', 'Regrowth, restoration planting, and enhancement monitoring.', ['Baseline imagery', 'Planting records', 'Survival surveys', 'Satellite time series'], ['Survival rate', 'Canopy recovery', 'Additionality context'], { purpose: 'Monitor restoration and reforestation performance against baseline.' }),
    ],
  },
  {
    id: 'water-blue-carbon',
    title: 'Water & Blue Carbon',
    cardLabel: 'Water & Blue Carbon',
    description: 'Wetlands, coasts, watersheds, marine systems, and hydrologic stress.',
    hex: '#4A86CF',
    types: [
      type('wetland-blue-carbon', 'Wetland / Blue Carbon', 'Mangroves, saltmarshes, seagrasses, and inland wetlands.', ['Satellite', 'Bathymetry', 'Water Quality', 'Tide Data', 'Field Plots'], ['Hydrology', 'Blue carbon pools', 'Disturbance'], { purpose: 'Assess wetland and blue-carbon pools with hydrology context.', satelliteLayers: ['Wetland extent', 'Tide-coordinated imagery', 'Water quality proxies'] }),
      type('coastal-mangrove', 'Coastal / Mangrove', 'Coastal protection, sediment dynamics, and carbon sequestration.', ['Drone Imagery', 'Sediment Data', 'Wave / Tide Data', 'Field Plots'], ['Mangrove extent', 'Sediment accretion', 'Protection services'], { purpose: 'Monitor coastal mangrove systems and sediment dynamics.' }),
      type('freshwater-watershed', 'Freshwater / Watershed', 'Watershed condition, stream networks, and basin-scale indicators.', ['Satellite', 'USGS / public hydrology', 'AOI boundary', 'Field samples'], ['Basin stress', 'Land-use pressure'], { purpose: 'Frame freshwater and watershed-scale DMRV with public hydrology where available.' }),
      type('marine-ocean', 'Marine / Ocean', 'Open-water and coastal ocean screening — plastics, chlorophyll, and alerts.', ['Hyperspectral / EMIT', 'PACE metadata', 'AOI', 'Public catalogs'], ['Plastic risk screening', 'Ocean color context'], { purpose: 'Support marine evidence workflows — screening only until live adapters confirm.' }),
      type('water-quality', 'Water Quality', 'Nutrients, contaminants, and compliance-oriented water readings.', ['Lab results', 'Sensor feeds', 'Public monitoring stations', 'AOI'], ['Parameter exceedance', 'Trend vs baseline'], { purpose: 'Organize water-quality evidence for DMRV and accountability packets.' }),
      type('flood-hydrology', 'Flood / Hydrology', 'Flood extent, hydrologic anomalies, and civic flood intelligence.', ['Gauge data', 'NWS / USGS', 'Satellite flood masks', 'Community reports'], ['Flood stage', 'Exposure', 'Alert routing'], { purpose: 'Structure flood and hydrology DMRV — does not replace official emergency alerts.' }),
      type('drought-water-stress', 'Drought / Water Stress', 'Drought indices, storage trends, and scarcity indicators.', ['GRACE-FO proxies', 'SMAP / moisture', 'Reservoir records', 'AOI'], ['Moisture anomaly', 'Storage trend'], { purpose: 'Screen drought and water-stress signals for projects and regions.' }),
      type('water-treatment', 'Water Treatment / Sanitation', 'Treatment performance, discharge context, and facility evidence.', ['Permit records', 'Discharge monitoring', 'Facility location', 'Inspection reports'], ['Compliance context', 'Operational evidence'], { purpose: 'Bundle treatment and sanitation facility evidence for review.' }),
    ],
  },
  {
    id: 'pollution-emissions',
    title: 'Pollution & Emissions',
    cardLabel: 'Pollution & Emissions',
    description: 'Facility emissions, air quality, waste, and regulatory audit pathways.',
    hex: '#8B6914',
    types: [
      type('industrial-facility', 'Industrial / Facility Emissions', 'Stack, facility, and production-linked emissions integrity.', ['Facility ID', 'Reported emissions', 'Production throughput', 'Satellite proxies'], ['Intensity vs output', 'Reported vs inferred'], { purpose: 'Compare reported facility emissions to available signals (EIAS-style).' }),
      type('air-quality', 'Air Quality & Atmospheric', 'AQI, trace gases, and regional air-quality screening.', ['OpenAQ / live readings', 'AOI', 'Satellite AOD', 'Station metadata'], ['AQI band', 'Pollutant mix'], { purpose: 'Organize air-quality evidence for regional and facility context.' }),
      type('hazardous-waste', 'Hazardous Waste', 'Waste handling, manifest trails, and audit checklists.', ['Manifests', 'Facility records', 'Inspection history', 'AOI'], ['Handling gaps', 'Missing manifests'], { purpose: 'Structure hazardous-waste audit evidence and gaps.' }),
      type('regulatory-carb', 'Regulatory / CARB-Style Audit', 'Official inventory reconciliation and pollution-mapping reads.', ['CARB / EPA IDs', 'Official extracts', 'Coordinates', 'Reporting year'], ['Source reconciliation', 'Year alignment'], { purpose: 'Support regulatory audit workspaces with explicit dataset mode labels.' }),
      type('activity-emissions', 'Activity & Factor Emissions', 'Activity data × emission factors (e.g. Climatiq-backed estimates).', ['Activity quantity', 'Emission factor', 'Region', 'Source trail'], ['kgCO₂e estimate', 'Factor provenance'], { purpose: 'Calculate and store activity-based estimates with server-side factors.' }),
      type('methane-fugitive', 'Methane & Fugitive Emissions', 'Methane plumes, fugitive loss, and super-emitter screening.', ['Satellite methane products', 'Facility location', 'Sensor reads'], ['Plume proximity', 'Unreported release flags'], { purpose: 'Screen methane and fugitive claims — subject to product availability.' }),
    ],
  },
  {
    id: 'biodiversity-ecosystems',
    title: 'Biodiversity & Ecosystems',
    cardLabel: 'Biodiversity & Ecosystems',
    description: 'Habitat, species context, ecological scans, and protected areas.',
    hex: '#2F855A',
    types: [
      type('habitat-species', 'Habitat & Species', 'Habitat suitability and species-context evidence.', ['Land cover', 'Protected area layers', 'Field surveys', 'AOI'], ['Habitat risk', 'Connectivity'], { purpose: 'Frame habitat and species-related claims with explicit limits.' }),
      type('ecological-ndvi', 'Ecological / NDVI Screening', 'Landsat foliage, NDVI, and habitat stress screening.', ['Landsat / PC STAC', 'AOI', 'Date window'], ['NDVI mean', 'Canopy stress'], { purpose: 'Run ecological conservation scans when API host exposes routes.' }),
      type('marine-biodiversity', 'Marine Biodiversity', 'Coastal and marine ecological indicators.', ['Ocean color', 'Habitat maps', 'Fisheries context', 'AOI'], ['Ecosystem pressure', 'Protected waters'], { purpose: 'Organize marine biodiversity evidence categories.' }),
      type('invasive-disturbance', 'Invasive & Disturbance', 'Invasive spread, land disturbance, and recovery.', ['Change detection', 'Field observations', 'Management actions'], ['Disturbance patch', 'Recovery trend'], { purpose: 'Track disturbance and invasive-related ecosystem claims.' }),
      type('protected-area', 'Protected Area Integrity', 'Park, reserve, and conservation estate monitoring.', ['Boundary GIS', 'Patrol logs', 'Satellite alerts', 'AOI'], ['Encroachment', 'Patrol coverage'], { purpose: 'Monitor protected-area integrity with patrol and imagery context.' }),
    ],
  },
  {
    id: 'climate-risk-disaster',
    title: 'Climate Risk & Disaster',
    cardLabel: 'Climate Risk & Disaster',
    description: 'Flood, fire, drought, multi-hazard feeds, and screening.',
    hex: '#C05621',
    types: [
      type('flood-risk', 'Flood & Hydrometeorological Risk', 'Flood intelligence, routing preview, and ledger anchoring.', ['Gauge', 'NWS', 'FloodGuard signals', 'AOI'], ['Stage', 'Exposure', 'Routing dry-run'], { purpose: 'Civic flood intelligence DMRV — not a substitute for government alerts.' }),
      type('wildfire', 'Wildfire & Burn Severity', 'Fire perimeters, NBR, and post-fire recovery.', ['FIRMS / fire layers', 'NBR time series', 'AOI'], ['Burn severity', 'Recovery'], { purpose: 'Screen wildfire and burn-severity claims with dated imagery.' }),
      type('drought-risk', 'Drought & Water Stress Risk', 'Drought indices and storage anomalies for risk disclosure.', ['Moisture indices', 'Public drought maps', 'AOI'], ['Severity class', 'Duration'], { purpose: 'Support climate-risk disclosure for drought and water stress.' }),
      type('multi-hazard', 'Multi-Hazard / Global Signals', 'USGS, EONET, OpenAQ, and hazard feed aggregation.', ['Feed adapters', 'AOI', 'Time window'], ['Active hazards', 'Mission bridge'], { purpose: 'Aggregate global environmental signals for situational context.' }),
      type('earth-observation-screening', 'Earth Observation Screening', 'LEO scene-pair screening with explicit limitations.', ['AOI', 'Date range', 'PC / catalog adapters'], ['Scene availability', 'Metric confidence'], { purpose: 'Scene-level EO screening — not AOI-zonal certification unless extended.' }),
    ],
  },
  {
    id: 'urban-energy-infrastructure',
    title: 'Urban, Energy & Infrastructure',
    cardLabel: 'Urban & Infrastructure',
    description: 'Built environment, energy, heat island, and mobility.',
    hex: '#705196',
    types: [
      type('urban-built', 'Urban / Built Environment', 'Green cover, building emissions, and heat island mitigation.', ['Satellite', 'Building Data', 'Energy Data', 'Air Quality'], ['Canopy cover', 'Heat island'], { purpose: 'Evaluate urban environmental claims with building and canopy context.' }),
      type('building-energy', 'Building & Energy', 'Building energy use and emissions attribution.', ['Energy bills / disclosures', 'Floor area', 'EUI benchmarks'], ['Intensity', 'Disclosure gaps'], { purpose: 'Structure building-level energy and emissions evidence.' }),
      type('heat-island', 'Heat Island & Canopy', 'UHI metrics and urban greening interventions.', ['Land surface temp proxies', 'Canopy maps', 'AOI'], ['UHI delta', 'Canopy change'], { purpose: 'Screen heat-island and urban greening claims.' }),
      type('infrastructure-mobility', 'Infrastructure & Mobility', 'Transport, mobility, and infrastructure project impacts.', ['Mobility feeds', 'Project GIS', 'Traffic proxies'], ['Exposure', 'Emissions context'], { purpose: 'Bundle infrastructure and mobility evidence for urban projects.' }),
    ],
  },
  {
    id: 'supply-chain-claims',
    title: 'Supply Chain & Corporate Claims',
    cardLabel: 'Supply Chain & Corporate Claims',
    description: 'Facility claims, disclosure comparison, and corporate DMRV.',
    hex: '#2C5282',
    types: [
      type('emissions-integrity', 'Emissions Integrity Audit', 'Reported vs satellite vs production signals (EIAS).', ['Facility intake', 'Reported data', 'Satellite adapters', 'Production output unit'], ['ADI', 'Evidence packet'], { purpose: 'Run emissions integrity audits with explicit persistence rules.' }),
      type('satellite-disclosure', 'Satellite Disclosure Comparison', 'Compare public disclosures to geospatial indicators.', ['Disclosure docs', 'Satellite layers', 'AOI'], ['Mismatch flags', 'Missing evidence'], { purpose: 'Support satellite accountability and disclosure-integrity workflows.' }),
      type('corporate-facility', 'Corporate / Facility Claims', 'Company or facility environmental statements vs evidence.', ['Company filing', 'Facility GIS', 'Public records'], ['Claim vs evidence', 'Greenwashing flags'], { purpose: 'Organize corporate and facility claim review — not legal certification.' }),
      type('supply-chain-attestation', 'Supply Chain Attestation', 'Supplier attestations, scope 3 context, and chain-of-custody.', ['Supplier records', 'Shipment / SKU trail', 'Attestations'], ['Scope coverage', 'Missing tier'], { purpose: 'Structure supply-chain environmental attestations for validator review.' }),
    ],
  },
  {
    id: 'community-accountability',
    title: 'Community & Public Accountability',
    cardLabel: 'Community Accountability',
    description: 'Public reports, civic transparency, and community evidence.',
    hex: '#3182CE',
    types: [
      type('public-accountability', 'Public Accountability Reports', 'Community reports filed through DPAL with evidence trail.', ['Report body', 'Media attachments', 'Location', 'Category'], ['Verification status', 'Outcome tracking'], { purpose: 'Link community reports to DMRV evidence and resolution layers.' }),
      type('politician-transparency', 'Politician / Official Transparency', 'Accountability research with sourced evidence lab.', ['Search queries', 'Source filters', 'Evidence drafts'], ['Source trail', 'Claim safety'], { purpose: 'Support public accountability research with cautious claim language.' }),
      type('community-field', 'Community Field Evidence', 'Photos, witness notes, and local monitoring submissions.', ['Geo-tagged media', 'Witness statements', 'Time stamp'], ['Provenance', 'Corroboration'], { purpose: 'Ingest community field evidence into validator-ready packets.' }),
      type('resolution-outcomes', 'Resolution & Outcomes Tracking', 'Cases tracked through resolution layer outcomes.', ['Case ID', 'Status history', 'Ledger references'], ['Outcome', 'Accountability chain'], { purpose: 'Track verified cases through outcomes — status labels must stay accurate.' }),
    ],
  },
  {
    id: 'custom-intelligence',
    title: 'Custom & Advanced Intelligence',
    cardLabel: 'Custom Intelligence',
    description: 'Configurable frameworks and multi-source advanced workflows.',
    hex: '#718096',
    types: [
      type('custom-framework', 'Other / Custom Framework', 'Project-specific DMRV configuration.', ['Custom inputs', 'Documents', 'API feeds', 'Field evidence'], ['Flexible scope', 'Validator-defined'], { purpose: 'Configurable DMRV for non-standard ecosystems or pilots.' }),
      type('multi-source-advanced', 'Multi-Source Advanced Intelligence', 'Orchestrate Field OS, Command Center, and cross-module plans.', ['Super Agent goals', 'Module handoffs', 'Evidence shape'], ['Plan milestones', 'Safe workflow status'], { purpose: 'Advanced orchestration across DPAL modules — guidance only, no auto-publish.' }),
    ],
  },
];

export function getFamily(id: DmrvFamilyId): DmrvFamilyDef | undefined {
  return DMRV_FAMILIES.find((f) => f.id === id);
}

export function getType(familyId: DmrvFamilyId, typeId: string): DmrvTypeDef | undefined {
  return getFamily(familyId)?.types.find((t) => t.id === typeId);
}

export const PROFILE_SECTION_KEYS = [
  { key: 'purpose' as const, label: 'Purpose' },
  { key: 'requiredInputs' as const, label: 'Required Inputs' },
  { key: 'optionalInputs' as const, label: 'Optional Inputs' },
  { key: 'satelliteLayers' as const, label: 'Satellite Layers' },
  { key: 'groundTruthRequirements' as const, label: 'Ground Truth Requirements' },
  { key: 'aiEvaluationRules' as const, label: 'AI Evaluation Rules' },
  { key: 'riskFlags' as const, label: 'Risk Flags' },
  { key: 'evidencePacket' as const, label: 'Evidence Packet' },
  { key: 'validatorReview' as const, label: 'Validator Review' },
  { key: 'blockchainRecord' as const, label: 'Blockchain Record' },
  { key: 'finalReport' as const, label: 'Final Report / Dashboard' },
];
