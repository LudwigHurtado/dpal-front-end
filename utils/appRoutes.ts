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

/** Deep-link fragment for Field OS — scrolls to Super Agent (use with `/field-os#super-agent`). */
export const FIELD_OS_SUPER_AGENT_HASH = '#super-agent';

/** `sessionStorage` key: set before navigating to Field OS to scroll to Super Agent on arrival. */
export const FIELD_OS_SCROLL_SUPER_AGENT_SESSION_KEY = 'dpal_field_os_scroll_super_agent';

/**
 * Deep-link fragment used by Environmental Intelligence Hub CTAs to open a module's
 * "Watch DPAL Work" / workflow panel without auto-running any scan or live API calls.
 *
 * Honored by Forest Integrity, Hyperspectral Plastic Watch, and AquaScan (workflow rail).
 */
export const WATCH_DEEP_LINK_HASH = '#watch';

/** DOM id of the AquaScan workflow rail — used by deep-link scroll behavior. */
export const AQUASCAN_WORKFLOW_RAIL_ANCHOR_ID = 'aquascan-workflow-rail';

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

/** Resolved App view + optional detail ids when navigating by pathname (sidebar, deep links). */
export type PathNavigationTarget = {
  view: string;
  marketplaceDetailListingId?: string;
  epaFacilityDetailId?: string;
  aquaScanViewerReportId?: string;
  aquaScanSituationRoomId?: string;
  carbViewerReportId?: string;
  carbSituationRoomId?: string;
};

/** Map a pathname to the App shell view (and detail ids) — shared by URL→view and path-first navigation. */
export function resolvePathNavigationTarget(pathname: string): PathNavigationTarget | null {
  const normalized = pathname.replace(/\/$/, '') || '/';

  const listingIdFromPath = parseMarketplaceListingIdFromPath(normalized);
  if (listingIdFromPath) {
    return { view: 'marketplaceMissionDetail', marketplaceDetailListingId: listingIdFromPath };
  }

  const epaFacilityIdFromPath = parseEpaFacilityIdFromPath(normalized);
  if (epaFacilityIdFromPath) {
    return { view: 'epaGhgFacilityDetail', epaFacilityDetailId: epaFacilityIdFromPath };
  }

  const aquaScanReportIdFromPath = parseAquaScanReportIdFromPath(normalized);
  if (aquaScanReportIdFromPath) {
    return { view: 'aquascanReportViewer', aquaScanViewerReportId: aquaScanReportIdFromPath };
  }

  const aquaScanSituationRoomIdFromPath = parseAquaScanSituationRoomIdFromPath(normalized);
  if (aquaScanSituationRoomIdFromPath) {
    return { view: 'aquascanSituationRoom', aquaScanSituationRoomId: aquaScanSituationRoomIdFromPath };
  }

  const carbReportIdFromPath = parseCarbReportIdFromPath(normalized);
  if (carbReportIdFromPath) {
    return { view: 'carbReportViewer', carbViewerReportId: carbReportIdFromPath };
  }

  const carbSituationRoomIdFromPath = parseCarbSituationRoomIdFromPath(normalized);
  if (carbSituationRoomIdFromPath) {
    return { view: 'carbSituationRoom', carbSituationRoomId: carbSituationRoomIdFromPath };
  }

  const v = pathToView(normalized);
  if (!v) return null;
  return { view: v === 'carbonComplianceWorkspace' ? 'dmrvSelector' : v };
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
  situationRoom: '/situation-room',
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
  carbonDMRV: '/carbon',
  ecologicalConservation: '/ecology',
  earthObservation: '/earth-observation',
  /** Hyperspectral Plastic Watch — EMIT/PACE evidence-support (aliases in pathToView) */
  hyperspectralPlasticWatch: '/hyperspectral-plastic-watch',
  /** Forestry Protection — Forest Integrity + satellite monitoring */
  forestIntegrity: '/forest-integrity',
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
  /** DPAL Field OS agentic command center */
  fieldOS: '/field-os',
  /** DPAL FloodGuard — verified civic flood intelligence for cities */
  floodGuard: '/floodguard',
  /** Aqualand Well alias for upgraded AquaScan workspace */
  aqualandWell: '/water/aqualand',
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
  /** Shareable DPAL one-pager gallery (Environmental Intelligence hub family). */
  dpalInfographicsGallery: '/environmental-intelligence/infographics',
  environmentalIntelligenceHub: '/environmental-intelligence',
  epaGhgLive: '/environmental-intelligence/epa-ghg',
  envirofactsGeoIntelligence: '/environmental-intelligence/envirofacts-map',
  /** Satellite Intelligence + Disclosure Integrity — multi-source claim comparison (aliases in pathToView). */
  satelliteAccountability: '/environmental-intelligence/satellite-accountability',
  /** Climatiq emissions calculator — server-proxied factor search + kgCO2e estimate */
  climatiqCalculator: '/environmental-intelligence/climatiq',
  /** Adaptable DMRV selector — environment-type evaluation framework */
  dmrvSelector: '/dmrv',
  previewEnvironmentalCommandCenter: '/preview/environmental-command-center',
  previewEnvironmentalIntelligenceHub: '/preview/environmental-intelligence-hub',
  previewFuelStorageAudit: '/preview/fuel-storage-audit',
  previewEvidencePacket: '/preview/evidence-packet',
  previewModule: '/preview/module-preview',
  /** CarbonPura partner command center — orchestrates live DPAL environmental engines */
  carbonPuraWorkspace: '/partners/carbonpura',
  /** Investor-facing pitch / walkthrough page. Shareable meeting link. */
  investorDemo: '/investor-demo',
  /** DPAL Command Center — multi-mode orchestration shell (shared adapters / evidence shape). */
  commandCenter: '/command-center',
  /** Carbon compliance entry — DMRV hub with all DMRV category cards (alias: `/carbon-compliance`, `/cad-trust`). */
  carbonComplianceWorkspace: '/dmrv',
  /** Platform Architecture v2 — Environmental workspace hub (aliases: `/environmental-hub`). */
  environmentalWorkspace: '/environmental-workspace',
  /** Platform Architecture v2 — secondary modules directory (aliases: `/modules`, `/more-tools`). */
  additionalModules: '/additional-modules',
  /** Classic DPAL main-menu tile grid — preserved for operators who prefer the legacy explorer. */
  legacyMainMenuGrid: '/classic-home',
  /** Deep Owl intelligence service line catalog (30 category launchers). */
  deepOwlServiceLines: '/deep-owl/service-lines',
  globalIntelligenceMap: '/global-intelligence-map',
};

export function viewToPath(view: string): string {
  return VIEW_PATHS[view] ?? '/';
}

/** Normalize pathname and resolve to a view id, or null if unknown. */
export function pathToView(pathname: string): string | null {
  const normalized = pathname.replace(/\/$/, '') || '/';
  if (normalized === '/planetary-intelligence' || normalized === '/workspaces') return 'mainMenu';
  if (normalized === '/deep-owl' || normalized === '/deep-owl/service-lines') return 'deepOwlServiceLines';
  if (normalized === '/global-intelligence-map') return 'globalIntelligenceMap';
  if (normalized === '/carbon-compliance' || normalized === '/cad-trust') return 'dmrvSelector';
  if (/^\/carbon-compliance\/[^/]+\/config\//.test(normalized)) return 'dmrvSelector';
  if (normalized === '/dmrv' || normalized.startsWith('/dmrv/')) return 'dmrvSelector';
  if (normalized === '/modules' || normalized === '/more-tools' || normalized === '/more-dpal-modules') return 'additionalModules';
  if (normalized === '/carbon-pura' || normalized === '/partner/carbonpura' || normalized === '/carbonpura-command-center') {
    return 'carbonPuraWorkspace';
  }
  if (normalized === '/environmental-hub') return 'environmentalWorkspace';
  if (normalized === '/carbon-mrv') return 'carbonDMRV';
  if (normalized === '/carbonpura') return 'carbonPuraWorkspace';
  if (normalized === '/ocean-plastic') return 'hyperspectralPlasticWatch';
  if (normalized === '/biosphere-land') return 'earthObservation';
  if (normalized === '/evidence') return 'previewEvidencePacket';
  if (normalized === '/disaster-risk') return 'globalSignals';
  if (normalized === '/emissions-industrial') return 'carbEmissionsAudit';
  /** Legacy map/beacon screen removed — land on Mission Marketplace. */
  if (normalized === '/field-missions') return 'missionMarketplace';
  if (normalized === '/environmental/epa-live') return 'epaGhgLive';
  if (normalized === '/environmental/envirofacts-map') return 'envirofactsGeoIntelligence';
  if (normalized === '/satellite-accountability' || normalized === '/environmental-intelligence/disclosure-integrity') {
    return 'satelliteAccountability';
  }
  if (normalized === '/forestry-protection' || normalized === '/environmental-intelligence/forest-integrity') {
    return 'forestIntegrity';
  }
  if (
    normalized === '/plastic-watch' ||
    normalized === '/hyperspectral-plastic-watch' ||
    normalized === '/environmental-intelligence/hyperspectral-plastic-watch' ||
    normalized === '/water/plastic-watch'
  ) {
    return 'hyperspectralPlasticWatch';
  }
  /** Legacy AFOLU paths kept for backwards-compatible deep links/bookmarks. */
  if (normalized === '/aflu' || normalized === '/aflo' || normalized === '/afolu-engine' || normalized === '/afolu-credit-engine') return 'afoluEngine';
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
