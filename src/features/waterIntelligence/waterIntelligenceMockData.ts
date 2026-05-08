/**
 * Demo / pilot mock data for DPAL Water Intelligence — Colorado River flagship project.
 * All values are illustrative; labels must stay explicit (mock, demo, planned layers).
 */

export type WaterDataProvenanceLabel =
  | 'Live API'
  | 'Imported'
  | 'Fallback'
  | 'User-submitted'
  | 'Satellite-derived'
  | 'Sensor-derived'
  | 'AI-inferred'
  | 'Human-verified'
  | 'Blockchain-anchored'
  | 'Mock / Demo';

export interface WaterIntelligenceLayer {
  id: string;
  name: string;
  /** Single primary label — must not claim human-verified or blockchain unless true in product logic. */
  provenance: WaterDataProvenanceLabel;
  notes?: string;
}

export interface ColoradoBasinArea {
  id: string;
  label: string;
  sublabel?: string;
}

export const COLORADO_RIVER_PROJECT_ID = 'DPAL-WI-COLORADO-BASIN-PILOT-001';

export const COLORADO_RIVER_PROJECT = {
  projectId: COLORADO_RIVER_PROJECT_ID,
  name: 'Colorado River Basin Water Intelligence Pilot',
  projectType: 'river_basin' as const,
  primaryGeography: 'Colorado River Basin',
  primaryUnit: 'Acre-feet',
  reservoirsMonitored: ['Lake Powell', 'Lake Mead'],
  conservationFocus: 'Agriculture + urban savings',
  ledgerMode: 'Mock / Pilot',
  routingMode: 'Preview only',
  dataMode: 'Demo layers with future live API support',
  featuredWhy:
    'The Colorado River system connects snowpack, reservoirs, allocations, conservation, and drought/flood stress across multiple jurisdictions — a strong flagship for basin-scale Water Intelligence, evidence packets, and accountable records.',
  description:
    'Monitor river stress, reservoir conditions, drought signals, flood risk, agricultural conservation, urban conservation, verified water records, and water-credit evidence across the Colorado River system.',
  focusAreas: [
    'Lake Powell reservoir stress',
    'Lake Mead reservoir stress',
    'Upper Basin snowpack and runoff',
    'Lower Basin allocation pressure',
    'Agricultural irrigation conservation',
    'Urban water conservation',
    'Verified Water Conservation Units',
    'Flood risk monitoring',
    'Drought risk monitoring',
    'Evidence packets',
    'Public verification',
  ],
};

/** Planned or demo-only layers — not asserted as live feeds unless wired later. */
export const COLORADO_PLANNED_LAYERS: WaterIntelligenceLayer[] = [
  { id: 'usgs', name: 'USGS stream gauges', provenance: 'Mock / Demo', notes: 'Planned live: USGS NWIS when connected.' },
  { id: 'bor', name: 'Bureau of Reclamation reservoir data', provenance: 'Mock / Demo', notes: 'Planned live: USBR datasets when connected.' },
  { id: 'noaa', name: 'NOAA Colorado Basin forecast data', provenance: 'Mock / Demo', notes: 'Planned live: NOAA CPC / RFC outlooks when connected.' },
  { id: 'openet', name: 'OpenET evapotranspiration data', provenance: 'Mock / Demo', notes: 'Planned live: OpenET API when connected.' },
  {
    id: 'nasa',
    name: 'NASA / DPAL satellite water and vegetation indices',
    provenance: 'Satellite-derived',
    notes: 'Demo interpretation — not a substitute for agency hydrology.',
  },
  { id: 'field', name: 'Field reports', provenance: 'User-submitted', notes: 'Demo placeholders until ingestion is configured.' },
  {
    id: 'rights',
    name: 'Water-right and conservation documents',
    provenance: 'Imported',
    notes: 'Demo catalog only; no private documents in this pilot UI.',
  },
  { id: 'evidence', name: 'DPAL evidence packets', provenance: 'Mock / Demo', notes: 'Generated inside this pilot workflow.' },
  { id: 'ledger', name: 'DPAL ledger records', provenance: 'Mock / Demo', notes: 'Mock ledger — not represented as production blockchain anchors.' },
];

export const COLORADO_MAP_AREAS: ColoradoBasinArea[] = [
  { id: 'powell', label: 'Lake Powell', sublabel: 'Upper Basin storage' },
  { id: 'mead', label: 'Lake Mead', sublabel: 'Lower Basin storage' },
  { id: 'upper', label: 'Upper Basin', sublabel: 'Snowpack / runoff' },
  { id: 'lower', label: 'Lower Basin', sublabel: 'Allocation pressure' },
  { id: 'grand', label: 'Grand Valley agriculture', sublabel: 'Example irrigation conservation' },
  { id: 'front', label: 'Denver / Front Range', sublabel: 'Example urban conservation' },
  { id: 'yuma', label: 'Yuma / Imperial', sublabel: 'Example agricultural conservation' },
];

/** Demo status card values — synthetic, labeled mock. */
export const COLORADO_MOCK_STATUS = {
  basinStatus: 'Elevated stress — demo composite index (mock)',
  reservoirStress: 'Powell / Mead: declining trend flags (mock indicators)',
  conservationOpportunities: 'Irrigation + municipal savings zones flagged (demo)',
  activeRiskSignals: 'Drought watch + localized flood-season screening (demo)',
  evidencePackets: '0 generated — use workflow (demo)',
  ledgerRecords: 'Mock / Pilot — no production anchor',
  routingMode: 'Preview only — no notifications sent',
  dataMode: 'Demo layers — future live API support',
};
