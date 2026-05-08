/**
 * Pilot / demonstration mock data — Colorado River Water Conservation Exchange.
 * Label as Mock / Demo everywhere in UI.
 */

import type {
  ColoradoExchangePilotDashboard,
  PublicWaterVerificationRecord,
  VerifiedWaterConservationUnit,
  WaterBaselineRecord,
  WaterConservationProject,
  WaterEvidencePacket,
  WaterMonitoringRecord,
  WaterRightProfile,
  WaterTransaction,
} from './waterIntelligenceTypes';

export const COLORADO_EXCHANGE_PILOT_ID = 'DPAL-WI-COLORADO-EXCHANGE-PILOT-001';

export const COLORADO_EXCHANGE_PILOT = {
  id: COLORADO_EXCHANGE_PILOT_ID,
  name: 'Colorado River Water Conservation Exchange Pilot',
  headline:
    'DPAL demonstrates how conserved water can become a measured, evidence-backed, and transaction-ready asset while protecting agricultural water-right holders.',
  description:
    'A pilot system for measuring conserved consumptive water use, protecting agricultural water-right value, issuing pilot Verified Water Conservation Units, and tracking whether saved water is used for resale, system enhancement, or sequestered/archived conservation.',
  primaryGeography: 'Colorado River Basin',
  primaryUnit: 'Acre-feet',
  ledgerMode: 'Mock / Pilot',
  routingMode: 'Preview only',
  dataMode: 'Demo layers with future live API support',
};

export const COLORADO_EXCHANGE_DASHBOARD: ColoradoExchangePilotDashboard = {
  totalPilotProjects: 4,
  baselineAFUnderReview: 120_000,
  estimatedConservedAF: 18_500,
  netVerifiedConservationAF: 14_800,
  pilotVWcuEligible: 14_800,
  vwcuResale: 6_000,
  vwcuSystemEnhancement: 5_300,
  vwcuSequesteredArchived: 3_500,
  evidencePackets: 4,
  publicRecords: 2,
};

export const COLORADO_MOCK_PROJECTS: WaterConservationProject[] = [
  {
    id: 'WI-CO-GV-AG-001',
    name: 'Grand Valley Agricultural Conservation Pilot',
    method: 'Soil-moisture-based irrigation reduction',
    geography: 'Grand Valley, Western Colorado',
    goal: 'Verified acre-feet savings',
    baselineUseAF: 50_000,
    currentMonitoredUseAF: 42_000,
    transactionOptions: ['resale', 'system_enhancement', 'sequestered_archived'],
    status: 'monitoring',
    evidenceStatus: 'partial',
    humanVerified: false,
    blockchainAnchored: false,
    dataSourceLabels: ['mock_demo', 'sensor_derived', 'satellite_derived'],
  },
  {
    id: 'WI-CO-DEN-URB-002',
    name: 'Denver / Front Range Urban Conservation Pilot',
    method: 'Turf conversion, xeriscaping, reduced outdoor irrigation',
    geography: 'Denver / Front Range',
    goal: 'Municipal conservation and system reliability',
    baselineUseAF: 40_000,
    currentMonitoredUseAF: 32_000,
    status: 'evidence_submitted',
    evidenceStatus: 'moderate',
    humanVerified: false,
    blockchainAnchored: false,
    transactionOptions: ['system_enhancement', 'sequestered_archived'],
    dataSourceLabels: ['mock_demo', 'user_submitted', 'satellite_derived'],
  },
  {
    id: 'WI-CO-CBT-LEASE-003',
    name: 'Colorado Big Thompson Lease Prototype',
    method: 'Water-right holder conserves and leases saved water',
    geography: 'Colorado Big Thompson service area',
    goal: 'Compensate agriculture while supporting municipal demand',
    baselineUseAF: 20_000,
    currentMonitoredUseAF: 17_000,
    status: 'under_review',
    evidenceStatus: 'strong',
    humanVerified: false,
    blockchainAnchored: false,
    transactionOptions: ['resale', 'system_enhancement'],
    dataSourceLabels: ['mock_demo', 'imported', 'user_submitted'],
  },
  {
    id: 'WI-CO-RES-SYS-004',
    name: 'Reservoir System Enhancement Pilot',
    method: 'Archived or absorbed conserved water',
    geography: 'Lake Powell / Lake Mead system support',
    goal: 'Reservoir support, drought reserve, and public system benefit',
    baselineUseAF: 10_000,
    currentMonitoredUseAF: 8_500,
    status: 'draft',
    evidenceStatus: 'preliminary',
    humanVerified: false,
    blockchainAnchored: false,
    transactionOptions: ['system_enhancement', 'sequestered_archived'],
    dataSourceLabels: ['mock_demo', 'ai_inferred', 'satellite_derived'],
  },
];

function baselineForProject(pid: string): WaterBaselineRecord {
  const p = COLORADO_MOCK_PROJECTS.find((x) => x.id === pid)!;
  return {
    id: `BL-${pid}`,
    projectId: pid,
    historicalConsumptiveUseAF: p.baselineUseAF,
    irrigatedAcresOrAreaNote: 'Illustrative area — pilot documentation not asserted as legal proof.',
    waterSource: 'Colorado River system / connected supplies (demo)',
    waterRightReference: `WR-DEMO-${pid.slice(-3)}`,
    irrigationMethod: p.name.includes('Urban') ? 'Municipal outdoor / turf (demo)' : 'Irrigation district / ditch (demo)',
    weatherContext: 'Normalized to pilot storytelling window (mock)',
    etEstimateNote: 'OpenET-class ET placeholder — planned live integration',
    confidenceScoreLabel: p.evidenceStatus === 'strong' ? 'Medium-high (demo)' : 'Medium (demo)',
    dataSourceLabels: ['mock_demo', 'imported'],
  };
}

function monitoringForProject(pid: string): WaterMonitoringRecord {
  const p = COLORADO_MOCK_PROJECTS.find((x) => x.id === pid)!;
  return {
    id: `MON-${pid}`,
    projectId: pid,
    periodLabel: 'Pilot monitoring window (demo)',
    currentConsumptiveUseAF: p.currentMonitoredUseAF,
    soilMoistureOrIrrigationNote:
      p.name.includes('Grand Valley') ? 'Soil moisture trend down vs baseline (sensor demo)' : 'Outdoor demand reduction trend (demo)',
    satelliteFieldEvidenceNote: 'NDWI / land-use change screening — not zonal adjudication (demo)',
    userReportsNote: 'Optional operator reports — not verified',
    evidenceGaps: ['Independent legal review', 'Authority program enrollment', 'Field audit chain'],
    dataSourceLabels: ['mock_demo', 'satellite_derived', 'sensor_derived'],
  };
}

export const COLORADO_MOCK_BASELINES: WaterBaselineRecord[] = COLORADO_MOCK_PROJECTS.map((x) =>
  baselineForProject(x.id),
);

export const COLORADO_MOCK_MONITORING: WaterMonitoringRecord[] = COLORADO_MOCK_PROJECTS.map((x) =>
  monitoringForProject(x.id),
);

export const COLORADO_MOCK_RIGHTS: WaterRightProfile[] = COLORADO_MOCK_PROJECTS.map((p) => ({
  id: `WRP-${p.id}`,
  projectId: p.id,
  holderLabel: 'Illustrative priority / shareholder (demo)',
  entitlementReference: `Entitlement-DEMO-${p.id.slice(-3)}`,
  conservationAgreementStatus: p.status === 'draft' ? 'Not executed (demo)' : 'Draft / under negotiation (demo)',
  leaseEligibility: 'Subject to district rules and contracts — demo only',
  authorityReviewNeeded: true,
  legalReviewNeeded: true,
  compensationStatus: 'Not disbursed — demonstration',
  riskNotes:
    'DPAL does not transfer legal water rights. Any lease or forbearance requires proper authority, agreement, and review.',
}));

export const COLORADO_MOCK_EVIDENCE_PACKETS: WaterEvidencePacket[] = COLORADO_MOCK_PROJECTS.map((p) => ({
  id: `EVP-${p.id}`,
  projectId: p.id,
  projectSummary: `${p.name} — ${p.goal}`,
  locationSummary: p.geography,
  waterRightReference: `WR-DEMO-${p.id.slice(-3)}`,
  baselineRecordId: `BL-${p.id}`,
  monitoringRecordId: `MON-${p.id}`,
  calculatorSnapshot: null,
  satelliteSensorFieldNote: 'Satellite and sensor lines are demo interpretations only.',
  validatorNotesPlaceholder: 'Internal validator notes are not public unless marked public.',
  confidenceScore: p.evidenceStatus === 'strong' ? 0.78 : p.evidenceStatus === 'moderate' ? 0.62 : 0.45,
  evidenceHashPlaceholder: `demo-hash-${p.id}`,
  publicSafeSummary: `Pilot conservation performance summary for ${p.name}. Mock / demonstration record.`,
  transactionCategory: p.transactionOptions[0] ?? null,
  dataSourceLabels: ['mock_demo'],
}));

export const COLORADO_MOCK_VWCUS: VerifiedWaterConservationUnit[] = [
  {
    id: 'VWCU-DEMO-6000-RS',
    projectId: 'WI-CO-GV-AG-001',
    ownerLabel: 'Demo agricultural participant',
    acreFeet: 6000,
    waterRightReference: 'WR-DEMO-001',
    evidencePacketId: 'EVP-WI-CO-GV-AG-001',
    evidenceHash: 'demo-hash-WI-CO-GV-AG-001',
    verificationStatus: 'under_review',
    transactionCategory: 'resale',
    issueDate: '2026-04-01',
    transferStatus: 'Not transferred — demo',
    retirementStatus: 'Active',
    humanVerified: false,
    blockchainAnchored: false,
  },
  {
    id: 'VWCU-DEMO-5300-SE',
    projectId: 'WI-CO-DEN-URB-002',
    ownerLabel: 'Demo municipal sponsor',
    acreFeet: 5300,
    waterRightReference: 'WR-DEMO-002',
    evidencePacketId: 'EVP-WI-CO-DEN-URB-002',
    evidenceHash: 'demo-hash-WI-CO-DEN-URB-002',
    verificationStatus: 'evidence_submitted',
    transactionCategory: 'system_enhancement',
    issueDate: '2026-04-12',
    transferStatus: 'Not transferred — demo',
    retirementStatus: 'Active',
    humanVerified: false,
    blockchainAnchored: false,
  },
  {
    id: 'VWCU-DEMO-3500-SA',
    projectId: 'WI-CO-RES-SYS-004',
    ownerLabel: 'Demo system enhancement pool',
    acreFeet: 3500,
    waterRightReference: 'WR-DEMO-004',
    evidencePacketId: 'EVP-WI-CO-RES-SYS-004',
    evidenceHash: 'demo-hash-WI-CO-RES-SYS-004',
    verificationStatus: 'draft',
    transactionCategory: 'sequestered_archived',
    issueDate: '2026-05-01',
    transferStatus: 'Not transferred — demo',
    retirementStatus: 'Slated for archival (demo)',
    humanVerified: false,
    blockchainAnchored: false,
  },
];

export const COLORADO_MOCK_TRANSACTIONS: WaterTransaction[] = [
  {
    id: 'TX-DEMO-001',
    seller: 'Demo Grand Valley participant',
    buyer: 'Demo municipal conservation sponsor',
    units: 1200,
    acreFeet: 1200,
    pricePerAF: 0,
    totalValue: 0,
    category: 'resale',
    authorityApprovalStatus: 'Pending — demonstration only',
    escrowStatus: 'Not connected — no real escrow',
    transferStatus: 'No legal transfer asserted',
    ledgerStatus: 'Mock / Pilot ledger',
    publicRecordStatus: 'Preview public record available',
  },
  {
    id: 'TX-DEMO-002',
    seller: 'Demo Front Range program',
    buyer: 'Demo regional system reliability account',
    units: 800,
    acreFeet: 800,
    pricePerAF: 0,
    totalValue: 0,
    category: 'system_enhancement',
    authorityApprovalStatus: 'Review required — demo',
    escrowStatus: 'Not connected — no real escrow',
    transferStatus: 'No legal transfer asserted',
    ledgerStatus: 'Mock / Pilot ledger',
    publicRecordStatus: 'Internal preview',
  },
  {
    id: 'TX-DEMO-003',
    seller: 'Demo reservoir enhancement pool',
    buyer: 'Sequestered / archived conservation',
    units: 500,
    acreFeet: 500,
    pricePerAF: 0,
    totalValue: 0,
    category: 'sequestered_archived',
    authorityApprovalStatus: 'Policy pathway TBD — demo',
    escrowStatus: 'Not connected — no real escrow',
    transferStatus: 'No legal transfer asserted',
    ledgerStatus: 'Mock / Pilot ledger',
    publicRecordStatus: 'Public-safe summary only',
  },
];

export const COLORADO_PUBLIC_VERIFICATION_RECORDS: PublicWaterVerificationRecord[] = [
  {
    recordId: 'PUB-WI-CR-001',
    projectId: 'WI-CO-GV-AG-001',
    projectName: 'Grand Valley Agricultural Conservation Pilot',
    locationSummary: 'Grand Valley, Western Colorado (public-safe)',
    claimedConservationAF: 8_000,
    netVerifiedConservationAF: 6_200,
    evidenceHash: 'demo-hash-WI-CO-GV-AG-001',
    status: 'monitoring',
    transactionCategory: 'resale',
    timeline: [
      { at: '2026-03-15', label: 'Baseline packet drafted (demo)' },
      { at: '2026-04-01', label: 'Monitoring window opened (demo)' },
    ],
    dataSourceLabels: ['mock_demo', 'satellite_derived'],
  },
  {
    recordId: 'PUB-WI-CR-002',
    projectId: 'WI-CO-DEN-URB-002',
    projectName: 'Denver / Front Range Urban Conservation Pilot',
    locationSummary: 'Denver / Front Range (public-safe)',
    claimedConservationAF: 8_000,
    netVerifiedConservationAF: 5_800,
    evidenceHash: 'demo-hash-WI-CO-DEN-URB-002',
    status: 'evidence_submitted',
    transactionCategory: 'system_enhancement',
    timeline: [
      { at: '2026-03-20', label: 'Evidence packet assembled (demo)' },
      { at: '2026-04-12', label: 'Submitted for review (demo)' },
    ],
    dataSourceLabels: ['mock_demo', 'user_submitted'],
  },
];

/** Basin map areas (illustrative geometry labels). */
export const COLORADO_MAP_AREAS = [
  { id: 'powell', label: 'Lake Powell', sublabel: 'Upper Basin storage' },
  { id: 'mead', label: 'Lake Mead', sublabel: 'Lower Basin storage' },
  { id: 'upper', label: 'Upper Basin', sublabel: 'Snowpack / runoff' },
  { id: 'lower', label: 'Lower Basin', sublabel: 'Allocation pressure' },
  { id: 'grand', label: 'Grand Valley', sublabel: 'Agricultural pilot' },
  { id: 'front', label: 'Denver / Front Range', sublabel: 'Urban pilot' },
  { id: 'cbt', label: 'CBT service area', sublabel: 'Lease prototype' },
];

export const COLORADO_PLANNED_LAYERS: Array<{ id: string; name: string; provenance: string; notes?: string }> = [
  { id: 'usgs', name: 'USGS stream gauges', provenance: 'Planned / demo', notes: 'Planned live: USGS Water Data APIs.' },
  { id: 'bor', name: 'Bureau of Reclamation reservoir data', provenance: 'Planned / demo', notes: 'Planned live: USBR RISE / public datasets.' },
  { id: 'noaa', name: 'NOAA Colorado Basin forecasts', provenance: 'Planned / demo', notes: 'NWPS / CBRFC products when connected.' },
  { id: 'openet', name: 'OpenET evapotranspiration', provenance: 'Planned / demo', notes: 'Field-scale ET when API connected.' },
  {
    id: 'nasa',
    name: 'NASA / DPAL satellite water and vegetation indices',
    provenance: 'Satellite-derived (demo)',
    notes: 'Interpretation only — not agency hydrology.',
  },
  { id: 'field', name: 'Field reports', provenance: 'User-submitted (demo)', notes: 'Ingestion placeholder.' },
  {
    id: 'rights',
    name: 'Water-right and conservation documents',
    provenance: 'Imported (demo)',
    notes: 'No private documents in this UI.',
  },
];
