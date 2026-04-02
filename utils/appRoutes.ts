/**
 * Maps DPAL App.tsx `View` ids to URL pathnames for react-router sync.
 * Keep paths stable — bookmarks and shared links depend on them.
 */

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
  escrowService: '/escrow',
  coinLaunch: '/coin',
  subscription: '/subscription',
  aiSetup: '/ai-setup',
  fieldMissions: '/field-missions',
  goodDeedsMissions: '/good-deeds',
  storage: '/storage',
  politicianTransparency: '/politician',
  dpalLocator: '/locator',
  gameHub: '/games',
  reportProtect: '/report-protect',
  reportDashboard: '/report-dashboard',
  reportWorkPanel: '/report-work',
  helpCenter: '/help',
};

export function viewToPath(view: string): string {
  return VIEW_PATHS[view] ?? '/';
}

/** Normalize pathname and resolve to a view id, or null if unknown. */
export function pathToView(pathname: string): string | null {
  const normalized = pathname.replace(/\/$/, '') || '/';
  const hit = Object.entries(VIEW_PATHS).find(([, p]) => {
    const seg = p.replace(/\/$/, '') || '/';
    return seg === normalized;
  });
  return hit ? hit[0] : null;
}
