/** Stable keys for DMRV input configuration workspaces. */
export type DmrvInputConfigType =
  | 'satellite'
  | 'lidar'
  | 'field-plots'
  | 'biomass'
  | 'activity'
  | 'soil'
  | 'iot'
  | 'management'
  | 'weather'
  | 'field-survey'
  | 'fire'
  | 'grazing'
  | 'drone'
  | 'generic'
  | 'blockchain';

export type DmrvInputDef = {
  key: string;
  label: string;
  shortDescription: string;
  configType: DmrvInputConfigType;
  requiredForIntegrity: boolean;
  blockchainAnchorRequired: boolean;
  validationRole: string;
};

const INPUT_CATALOG: Record<string, DmrvInputDef> = {
  'satellite-imagery': {
    key: 'satellite-imagery',
    label: 'Satellite Imagery',
    shortDescription: 'Orbital screening layers — scene selection, cloud limits, and AOI coverage rules.',
    configType: 'satellite',
    requiredForIntegrity: true,
    blockchainAnchorRequired: true,
    validationRole: 'Remote sensing evidence',
  },
  lidar: {
    key: 'lidar',
    label: 'LiDAR',
    shortDescription: 'Point-cloud source, vertical accuracy, and canopy height model settings.',
    configType: 'lidar',
    requiredForIntegrity: true,
    blockchainAnchorRequired: false,
    validationRole: 'Structural canopy evidence',
  },
  'field-plots': {
    key: 'field-plots',
    label: 'Field Plots',
    shortDescription: 'Ground plot inventory with GPS, species, and surveyor provenance.',
    configType: 'field-plots',
    requiredForIntegrity: true,
    blockchainAnchorRequired: true,
    validationRole: 'Field verification',
  },
  'biomass-data': {
    key: 'biomass-data',
    label: 'Biomass Data',
    shortDescription: 'Biomass equations, carbon fractions, and uncertainty bounds.',
    configType: 'biomass',
    requiredForIntegrity: true,
    blockchainAnchorRequired: true,
    validationRole: 'Carbon stock estimation',
  },
  'activity-data': {
    key: 'activity-data',
    label: 'Activity Data',
    shortDescription: 'Activity records, emission/removal factors, and supporting documents.',
    configType: 'activity',
    requiredForIntegrity: true,
    blockchainAnchorRequired: false,
    validationRole: 'Activity accounting',
  },
  'soil-samples': {
    key: 'soil-samples',
    label: 'Soil Samples',
    shortDescription: 'Lab results, sample depth, organic carbon %, and chain of custody.',
    configType: 'soil',
    requiredForIntegrity: true,
    blockchainAnchorRequired: true,
    validationRole: 'Soil carbon evidence',
  },
  'iot-sensors': {
    key: 'iot-sensors',
    label: 'IoT Sensors',
    shortDescription: 'Continuous sensor feeds with calibration and tamper detection.',
    configType: 'iot',
    requiredForIntegrity: false,
    blockchainAnchorRequired: false,
    validationRole: 'Sensor monitoring',
  },
  'management-data': {
    key: 'management-data',
    label: 'Management Data',
    shortDescription: 'Practice records, interventions, and land-management documentation.',
    configType: 'management',
    requiredForIntegrity: true,
    blockchainAnchorRequired: false,
    validationRole: 'Practice verification',
  },
  'weather-data': {
    key: 'weather-data',
    label: 'Weather Data',
    shortDescription: 'Meteorological provider, station ID, variables, and gap tolerance.',
    configType: 'weather',
    requiredForIntegrity: false,
    blockchainAnchorRequired: false,
    validationRole: 'Meteorological context',
  },
  'field-surveys': {
    key: 'field-surveys',
    label: 'Field Surveys',
    shortDescription: 'Structured field surveys with photos and surveyor attribution.',
    configType: 'field-survey',
    requiredForIntegrity: true,
    blockchainAnchorRequired: true,
    validationRole: 'Field survey evidence',
  },
  'fire-data': {
    key: 'fire-data',
    label: 'Fire Data',
    shortDescription: 'Burn scar, FIRMS, and severity screening parameters.',
    configType: 'fire',
    requiredForIntegrity: true,
    blockchainAnchorRequired: false,
    validationRole: 'Fire regime evidence',
  },
  'grazing-data': {
    key: 'grazing-data',
    label: 'Grazing Data',
    shortDescription: 'Herd counts, stocking rates, and grazing period records.',
    configType: 'grazing',
    requiredForIntegrity: true,
    blockchainAnchorRequired: false,
    validationRole: 'Grazing pressure evidence',
  },
  'blockchain-log': {
    key: 'blockchain-log',
    label: 'Blockchain log',
    shortDescription: 'Evidence hash, ledger record, and public verification link.',
    configType: 'blockchain',
    requiredForIntegrity: true,
    blockchainAnchorRequired: true,
    validationRole: 'Integrity timestamp',
  },
};

/** Convert display label → stable slug key. */
export function labelToInputKey(label: string): string {
  const normalized = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (INPUT_CATALOG[normalized]) return normalized;
  const alias: Record<string, string> = {
    'satellite-imagery': 'satellite-imagery',
    satellite: 'satellite-imagery',
    'field-plot': 'field-plots',
    'soil-sample': 'soil-samples',
    'soil-cores': 'soil-samples',
    'iot-sensor': 'iot-sensors',
    'drone-imagery': 'drone',
    'blockchain': 'blockchain-log',
  };
  return alias[normalized] ?? normalized;
}

function inferConfigType(key: string, label: string): DmrvInputConfigType {
  const known = INPUT_CATALOG[key]?.configType;
  if (known) return known;
  const lower = `${key} ${label}`.toLowerCase();
  if (/satellite|landsat|sentinel|pace|orbital/.test(lower)) return 'satellite';
  if (/lidar|laser/.test(lower)) return 'lidar';
  if (/field plot|plot/.test(lower)) return 'field-plots';
  if (/biomass|ndvi|canopy/.test(lower)) return 'biomass';
  if (/activity|emission factor|production/.test(lower)) return 'activity';
  if (/soil/.test(lower)) return 'soil';
  if (/iot|sensor/.test(lower)) return 'iot';
  if (/management|practice|intervention/.test(lower)) return 'management';
  if (/weather|rainfall|wind/.test(lower)) return 'weather';
  if (/survey|patrol|validation/.test(lower)) return 'field-survey';
  if (/fire|burn|firms/.test(lower)) return 'fire';
  if (/graz/.test(lower)) return 'grazing';
  if (/drone|uav/.test(lower)) return 'drone';
  if (/blockchain|ledger|hash/.test(lower)) return 'blockchain';
  return 'generic';
}

/** Resolve registry entry for a chip label — creates a fallback def for unknown labels. */
export function resolveDmrvInputDef(label: string): DmrvInputDef {
  const key = labelToInputKey(label);
  const existing = INPUT_CATALOG[key];
  if (existing) return existing;
  const configType = inferConfigType(key, label);
  return {
    key,
    label: label.trim(),
    shortDescription: `Configure ${label.trim()} sources, validation rules, and evidence linkage for this DMRV type.`,
    configType,
    requiredForIntegrity: configType !== 'iot' && configType !== 'weather',
    blockchainAnchorRequired: configType === 'satellite' || configType === 'field-plots',
    validationRole: 'Supporting evidence',
  };
}

export function getDmrvInputByKey(key: string): DmrvInputDef | undefined {
  return INPUT_CATALOG[key] ?? undefined;
}

export function getInputDefsForLabels(labels: string[]): DmrvInputDef[] {
  const seen = new Set<string>();
  const out: DmrvInputDef[] = [];
  for (const label of labels) {
    const def = resolveDmrvInputDef(label);
    if (seen.has(def.key)) continue;
    seen.add(def.key);
    out.push(def);
  }
  return out;
}

export const DMRV_INPUT_CATALOG = INPUT_CATALOG;
