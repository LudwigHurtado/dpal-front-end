export type WaterBodyType =
  | 'Coastal Area'
  | 'Farm Runoff Zone'
  | 'Industrial Discharge Zone'
  | 'Lake'
  | 'Mining Area'
  | 'Reservoir'
  | 'River'
  | 'Wetland';

export type ConcernType =
  | 'Algae Bloom'
  | 'Drought'
  | 'Flooding'
  | 'Industrial Discharge'
  | 'Runoff'
  | 'Suspected Contamination'
  | 'Thermal Anomaly'
  | 'Turbidity';

export type SuspectedSource = 'Agriculture' | 'Factory' | 'Mining' | 'Sewage' | 'Unknown';

export type CommunityImpact =
  | 'Drinking water'
  | 'crops'
  | 'fish'
  | 'homes'
  | 'livestock'
  | 'public health'
  | 'school';

export type RiskBand = 'Low concern' | 'Watchlist' | 'Elevated' | 'High Risk';

export interface AquaScanProject {
  id: string;
  projectName: string;
  waterBodyType: WaterBodyType;
  locationName: string;
  latitude: string;
  longitude: string;
  polygonPlaceholder: string;
  concernType: ConcernType;
  suspectedSource: SuspectedSource;
  communityImpact: CommunityImpact[];
  evidenceCount: number;
  hasLabResult: boolean;
  validatorStatus: 'Pending' | 'Reviewed' | 'Validated';
}

export interface SatelliteLayer {
  id: string;
  name: string;
  purpose: string;
  capability: string;
  category: 'optical' | 'radar' | 'thermal' | 'hydrology';
}

export interface WaterIndicator {
  id: string;
  label: string;
  explanation: string;
  value: string;
  trend: string;
  status: 'Normal' | 'Watchlist' | 'Elevated' | 'High Risk';
}

export interface EvidencePacketMock {
  packetId: string;
  auditId: string;
  ledgerHash: string;
  validatorStatus: string;
  recommendedNextAction: string;
}

export const waterBodyTypes: WaterBodyType[] = [
  'Coastal Area',
  'Farm Runoff Zone',
  'Industrial Discharge Zone',
  'Lake',
  'Mining Area',
  'Reservoir',
  'River',
  'Wetland',
];

export const concernTypes: ConcernType[] = [
  'Algae Bloom',
  'Drought',
  'Flooding',
  'Industrial Discharge',
  'Runoff',
  'Suspected Contamination',
  'Thermal Anomaly',
  'Turbidity',
];

export const suspectedSources: SuspectedSource[] = ['Agriculture', 'Factory', 'Mining', 'Sewage', 'Unknown'];

export const communityImpactOptions: CommunityImpact[] = [
  'Drinking water',
  'crops',
  'fish',
  'homes',
  'livestock',
  'public health',
  'school',
];

export const mockWaterProjects: AquaScanProject[] = [
  {
    id: 'AQ-1042',
    projectName: 'Cedar River Turbidity Watch',
    waterBodyType: 'River',
    locationName: 'Cedar River Basin, IA',
    latitude: '41.9779',
    longitude: '-91.6656',
    polygonPlaceholder: 'Boundary: Riverside floodplain segment A',
    concernType: 'Turbidity',
    suspectedSource: 'Agriculture',
    communityImpact: ['Drinking water', 'crops', 'public health'],
    evidenceCount: 3,
    hasLabResult: false,
    validatorStatus: 'Pending',
  },
  {
    id: 'AQ-1043',
    projectName: 'Delta Thermal Stress Review',
    waterBodyType: 'Coastal Area',
    locationName: 'Sacramento-San Joaquin Delta, CA',
    latitude: '38.0517',
    longitude: '-121.5730',
    polygonPlaceholder: 'Boundary: Delta thermal segment C',
    concernType: 'Thermal Anomaly',
    suspectedSource: 'Unknown',
    communityImpact: ['fish', 'homes', 'public health'],
    evidenceCount: 6,
    hasLabResult: true,
    validatorStatus: 'Reviewed',
  },
];

export const mockSatelliteLayers: SatelliteLayer[] = [
  {
    id: 'sentinel2',
    name: 'Sentinel-2',
    purpose: 'Water color, turbidity, vegetation/water edge',
    capability: 'High-detail optical analysis for visible conditions',
    category: 'optical',
  },
  {
    id: 'landsat89',
    name: 'Landsat 8/9',
    purpose: 'Historical comparison and surface temperature',
    capability: 'Long-term trend review with thermal context',
    category: 'thermal',
  },
  {
    id: 'sentinel1',
    name: 'Sentinel-1 SAR',
    purpose: 'Flood and water extent through clouds',
    capability: 'Cloud-robust radar snapshots for extent mapping',
    category: 'radar',
  },
  {
    id: 'sentinel3',
    name: 'Sentinel-3',
    purpose: 'Chlorophyll, algae, large water body monitoring',
    capability: 'Broad-area water quality indicators',
    category: 'optical',
  },
  {
    id: 'swot',
    name: 'SWOT',
    purpose: 'River/lake height and surface water extent',
    capability: 'Hydrology geometry and extent analytics',
    category: 'hydrology',
  },
  {
    id: 'gracefo',
    name: 'GRACE-FO',
    purpose: 'Basin-level water storage/drought trend',
    capability: 'Storage depletion and drought trajectory',
    category: 'hydrology',
  },
  {
    id: 'ecostress',
    name: 'ECOSTRESS',
    purpose: 'Thermal stress and evapotranspiration',
    capability: 'Heat stress and evapotranspiration diagnostics',
    category: 'thermal',
  },
];

export const mockEvidencePackets: EvidencePacketMock[] = [
  {
    packetId: 'PKT-AQ-1042-01',
    auditId: 'AUD-2026-04-25-1042',
    ledgerHash: '0xwatera1e3f9189be7',
    validatorStatus: 'Pending validator assignment',
    recommendedNextAction: 'Request water sample and compare with previous dry-season baseline.',
  },
];

