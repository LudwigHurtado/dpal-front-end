/**
 * Maps DPAL App.tsx `View` ids to URL pathnames for react-router sync.
 * Keep paths stable — bookmarks and shared links depend on them.
 */

/** Marketplace listing detail — not in VIEW_PATHS; path includes id (see `marketplaceMissionDetailPath`). */
export const MARKETPLACE_MISSION_DETAIL_PREFIX = '/missions/m';

export function marketplaceMissionDetailPath(listingId: string): string {
  return `${MARKETPLACE_MISSION_DETAIL_PREFIX}/${encodeURIComponent(listingId)}`;
}

/** Returns raw id segment or null if pathname is not a marketplace mission detail URL. */
export function parseMarketplaceListingIdFromPath(pathname: string): string | null {
  const normalized = pathname.replace(/\/$/, '') || '/';
  const m = normalized.match(/^\/missions\/m\/([^/]+)$/);
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
  /** DPAL Global Signals Engine — live feeds from USGS / NASA EONET / OpenAQ */
  globalSignals: '/global-signals',
};

export function viewToPath(view: string): string {
  return VIEW_PATHS[view] ?? '/';
}

/** Normalize pathname and resolve to a view id, or null if unknown. */
export function pathToView(pathname: string): string | null {
  const normalized = pathname.replace(/\/$/, '') || '/';
  /** Legacy map/beacon screen removed — land on Mission Marketplace. */
  if (normalized === '/field-missions') return 'missionMarketplace';
  if (/^\/missions\/m\/[^/]+$/.test(normalized)) return 'marketplaceMissionDetail';
  const hit = Object.entries(VIEW_PATHS).find(([, p]) => {
    const seg = p.replace(/\/$/, '') || '/';
    return seg === normalized;
  });
  return hit ? hit[0] : null;
}
