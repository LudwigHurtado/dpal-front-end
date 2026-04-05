import type { Category } from '../types';

const KEY = 'dpal-nav-session-v1';

/** Must match `View` in App.tsx — used to reject corrupted session data. */
export const ALLOWED_APP_VIEWS = new Set<string>([
  'mainMenu',
  'categorySelection',
  'categoryGateway',
  'categoryModeShell',
  'hub',
  'heroHub',
  'educationRoleSelection',
  'reportSubmission',
  'missionComplete',
  'reputationAndCurrency',
  'store',
  'reportComplete',
  'liveIntelligence',
  'missionDetail',
  'appLiveIntelligence',
  'generateMission',
  'trainingHolodeck',
  'tacticalVault',
  'transparencyDatabase',
  'aiRegulationHub',
  'incidentRoom',
  'threatMap',
  'teamOps',
  'medicalOutpost',
  'academy',
  'aiWorkDirectives',
  'dpalLifts',
  'goodWheels',
  'outreachEscalation',
  'ecosystem',
  'sustainmentCenter',
  'offsetMarketplace',
  'escrowService',
  'coinLaunch',
  'subscription',
  'aiSetup',
  'fieldMissions',
  'goodDeedsMissions',
  'storage',
  'politicianTransparency',
  'dpalLocator',
  'gameHub',
  'reportProtect',
  'reportDashboard',
  'reportWorkPanel',
  'helpCenter',
]);

export type NavSessionPayload = {
  currentView: string;
  viewHistory: string[];
  selectedCategoryForSubmission: string | null;
  gatewayCategory: string | null;
};

export function readNavSession(): NavSessionPayload | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (!s || typeof s.currentView !== 'string') return null;
    const hist = Array.isArray(s.viewHistory) ? s.viewHistory.map(String).filter((v: string) => ALLOWED_APP_VIEWS.has(v)) : [];
    return {
      currentView: ALLOWED_APP_VIEWS.has(s.currentView) ? s.currentView : 'mainMenu',
      viewHistory: hist.slice(-40),
      selectedCategoryForSubmission: (s.selectedCategoryForSubmission as string) ?? null,
      gatewayCategory: (s.gatewayCategory as string) ?? null,
    };
  } catch {
    return null;
  }
}

export function writeNavSession(payload: NavSessionPayload): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(KEY, JSON.stringify(payload));
  } catch {
    /* quota exceeded — ignore */
  }
}

export function categoryFromSession(value: string | null): Category | null {
  if (!value) return null;
  return value as Category;
}
