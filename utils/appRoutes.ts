/**
 * Maps DPAL App.tsx `View` ids to URL pathnames for react-router sync.
 * Keep paths stable — bookmarks and shared links depend on them.
 */

/** Marketplace listing detail — not in VIEW_PATHS; path includes id (see `marketplaceMissionDetailPath`). */
export const MARKETPLACE_MISSION_DETAIL_PREFIX = '/missions/m';
export const EPA_GHG_FACILITY_DETAIL_PREFIX = '/environmental-intelligence/epa-ghg/facility';
export const AQUASCAN_REPORT_PREFIX = '/aquascan/reports';
export const AQUASCAN_SITUATION_ROOM_PREFIX = '/aquascan/situation-room';
export const CARB_REPORT_PREFIX = '/carb/reports';
export const CARB_SITUATION_ROOM_PREFIX = '/carb/situation-room';

export function marketplaceMissionDetailPath(listingId: string): string {
  return `${MARKETPLACE_MISSION_DETAIL_PREFIX}/${encodeURIComponent(listingId)}`;
}

/** Returns raw id segment or null if pathname is not a marketplace mission detail URL. */
export function parseMarketplaceListingIdFromPath(pathname: string): string | null {
  const normalized = pathname.replace(/\/$/, '') || '/';
  const m = normalized.match(/^\/missions\/m\/([^/]+)$/);
  return m ? decodeURIComponent(m[1]) : null;
}

/** Returns raw facility id segment or null if pathname is not an EPA facility detail URL. */
export function parseEpaFacilityIdFromPath(pathname: string): string | null {
  const normalized = pathname.replace(/\/$/, '') || '/';
  const m = normalized.match(/^\/environmental-intelligence\/epa-ghg\/facility\/([^/]+)$/);
  return m ? decodeURIComponent(m[1]) : null;
}

export function epaFacilityDetailPath(facilityId: string): string {
  return `${EPA_GHG_FACILITY_DETAIL_PREFIX}/${encodeURIComponent(facilityId)}`;
}

export function aquaScanReportPath(reportId: string): string {
  return `${AQUASCAN_REPORT_PREFIX}/${encodeURIComponent(reportId)}`;
}

export function parseAquaScanReportIdFromPath(pathname: string): string | null {
  const normalized = pathname.replace(/\/$/, '') || '/';
  const m = normalized.match(/^\/aquascan\/reports\/([^/]+)$/);
  return m ? decodeURIComponent(m[1]) : null;
}

export function aquaScanSituationRoomPath(roomId: string): string {
  return `${AQUASCAN_SITUATION_ROOM_PREFIX}/${encodeURIComponent(roomId)}`;
}

export function parseAquaScanSituationRoomIdFromPath(pathname: string): string | null {
  const normalized = pathname.replace(/\/$/, '') || '/';
  const m = normalized.match(/^\/aquascan\/situation-room\/([^/]+)$/);
  return m ? decodeURIComponent(m[1]) : null;
}

export function carbReportPath(reportId: string): string {
  return `${CARB_REPORT_PREFIX}/${encodeURIComponent(reportId)}`;
}

export function parseCarbReportIdFromPath(pathname: string): string | null {
  const normalized = pathname.replace(/\/$/, '') || '/';
  const m = normalized.match(/^\/carb\/reports\/([^/]+)$/);
  return m ? decodeURIComponent(m[1]) : null;
}

export function carbSituationRoomPath(roomId: string): string {
  return `${CARB_SITUATION_ROOM_PREFIX}/${encodeURIComponent(roomId)}`;
}

export function parseCarbSituationRoomIdFromPath(pathname: string): string | null {
  const normalized = pathname.replace(/\/$/, '') || '/';
  const m = normalized.match(/^\/carb\/situation-room\/([^/]+)$/);
  return m ? decodeURIComponent(m[1]) : null;
}

/** view id → pathname (single segment or nested, no trailing slash except root). */
export const VIEW_PATHS: Record<string, string> = {
  mainMenu: '/',
  categorySelection: '/categories',
  categoryGateway: '/gateway',
  categoryModeShell: '/mode-shell',
  hub: '/hub',
  heroHub: '/hero',
  privateHubMenu: '/private-hub',
  educationRoleSelection: '/education',
  reportSubmission: '/report/new',
  missionComplete: '/mission/complete',
  reputationAndCurrency: '/reputation',
  store: '/store',
  reportComplete: '/report/done',
  liveIntelligence: '/intel',
  missionDetail: '/mission/detail',
  appLiveIntelligence: '/intel/app',
  generateMission: '/mission/build',
  trainingHolodeck: '/training',
  tacticalVault: '/vault',
  transparencyDatabase: '/transparency-db',
  aiRegulationHub: '/ai-regulation',
  incidentRoom: '/incident',
  threatMap: '/threat-map',
  teamOps: '/team-ops',
  medicalOutpost: '/medical',
  academy: '/academy',
  aiWorkDirectives: '/directives',
  dpalLifts: '/lifts',
  goodWheels: '/good-wheels',
  outreachEscalation: '/outreach',
  ecosystem: '/ecosystem',
  sustainmentCenter: '/sustainment',
  offsetMarketplace: '/offsets',
  carbonMRV: '/carbon',
  ecologicalConservation: '/ecology',
  earthObservation: '/earth-observation',
  /** DPAL Carbon Credit Platform — headquarters for all carbon categories */
  dpalCarbon: '/carbon-hub',
  /** DPAL AFOLU / Forest Integrity proof engine */
  afoluEngine: '/afolu',
  escrowService: '/escrow',
  coinLaunch: '/coin',
  subscription: '/subscription',
  aiSetup: '/ai-setup',
  goodDeedsMissions: '/good-deeds',
  storage: '/storage',
  politicianTransparency: '/politician',
  dpalLocator: '/locator',
  gameHub: '/games',
  reportProtect: '/report-protect',
  reportDashboard: '/report-dashboard',
  helpCenter: '/help',
  resolutionLayer: '/resolution',
  /** Missions Hub (marketplace, emergency shell, dashboards; `?section=` tabs). */
  missionMarketplace: '/missions',
  missionAssignmentV2: '/missions/v2',
  createMission: '/missions/create',
  /** DPAL Water Monitor + Verified Water Impact Credits */
  waterMonitor: '/water',
  /** Explicit AquaScan route for side-by-side testing */
  aquaScanWater: '/water/aquascan',
  aquascanReportViewer: '/aquascan/reports',
  aquascanSituationRoom: '/aquascan/situation-room',
  carbReportViewer: '/carb/reports',
  carbSituationRoom: '/carb/situation-room',
  /** Water Operations Engine route for operational workflows */
  waterOperationsEngine: '/water/monitor',
  /** DPAL Global Signals Engine — live feeds from USGS / NASA EONET / OpenAQ */
  globalSignals: '/global-signals',
  /** DPAL Impact Registry — environmental project tracking, evidence, monitoring, verification, claims */
  impactHub: '/impact',
  /** Air Quality Monitor — OpenAQ live readings, CO₂/CH₄/NO₂ scans, AQI dashboard */
  airQualityMonitor: '/air',
  emissionsIntegrityAudit: '/emissions-integrity-audit',
  carbEmissionsAudit: '/carb-emissions-audit',
  hazardousWasteAudit: '/hazardous-waste-audit',
  environmentalIntelligenceHub: '/environmental-intelligence',
  epaGhgLive: '/environmental-intelligence/epa-ghg',
  envirofactsGeoIntelligence: '/environmental-intelligence/envirofacts-map',
  previewEnvironmentalCommandCenter: '/preview/environmental-command-center',
  previewEnvironmentalIntelligenceHub: '/preview/environmental-intelligence-hub',
  previewFuelStorageAudit: '/preview/fuel-storage-audit',
  previewEvidencePacket: '/preview/evidence-packet',
  previewModule: '/preview/module-preview',
};

export function viewToPath(view: string): string {
  return VIEW_PATHS[view] ?? '/';
}

/** Normalize pathname and resolve to a view id, or null if unknown. */
export function pathToView(pathname: string): string | null {
  const normalized = pathname.replace(/\/$/, '') || '/';
  /** Legacy map/beacon screen removed — land on Mission Marketplace. */
  if (normalized === '/field-missions') return 'missionMarketplace';
  if (normalized === '/environmental/epa-live') return 'epaGhgLive';
  if (normalized === '/environmental/envirofacts-map') return 'envirofactsGeoIntelligence';
  /** Legacy AFOLU paths kept for backwards-compatible deep links/bookmarks. */
  if (normalized === '/aflu' || normalized === '/afolu-engine' || normalized === '/afolu-credit-engine') return 'afoluEngine';
  if (/^\/missions\/m\/[^/]+$/.test(normalized)) return 'marketplaceMissionDetail';
  if (/^\/environmental-intelligence\/epa-ghg\/facility\/[^/]+$/.test(normalized)) return 'epaGhgFacilityDetail';
  if (/^\/aquascan\/reports\/[^/]+$/.test(normalized)) return 'aquascanReportViewer';
  if (/^\/aquascan\/situation-room\/[^/]+$/.test(normalized)) return 'aquascanSituationRoom';
  if (/^\/carb\/reports\/[^/]+$/.test(normalized)) return 'carbReportViewer';
  if (/^\/carb\/situation-room\/[^/]+$/.test(normalized)) return 'carbSituationRoom';
  if (/^\/preview\/module-preview\/[^/]+$/.test(normalized)) return 'previewModule';
  const hit = Object.entries(VIEW_PATHS).find(([, p]) => {
    const seg = p.replace(/\/$/, '') || '/';
    return seg === normalized;
  });
  return hit ? hit[0] : null;
}
