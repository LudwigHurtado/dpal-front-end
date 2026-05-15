import { VIEW_PATHS } from '../../../../utils/appRoutes';

/** Default CarbonPura project id for context routing (local/demo until backend projects ship). */
export const CARBONPURA_DEFAULT_PROJECT_ID = 'carbonpura-demo-001';

/** Query param key for partner workspace handoff. */
export const CARBONPURA_PARTNER_KEY = 'carbonpura';

export type CarbonPuraContextParams = {
  partner?: string;
  projectId?: string;
  sourceSuite?: string;
};

/**
 * Build a safe deep link with CarbonPura context query params.
 * Target modules may ignore unknown params — this is context routing only.
 */
export function buildCarbonPuraContextUrl(
  route: string,
  projectId: string = CARBONPURA_DEFAULT_PROJECT_ID,
  extraParams?: Record<string, string | undefined>,
): string {
  const base = route.startsWith('/') ? route : `/${route}`;
  const params = new URLSearchParams();
  params.set('partner', CARBONPURA_PARTNER_KEY);
  params.set('projectId', projectId);
  if (extraParams) {
    for (const [key, value] of Object.entries(extraParams)) {
      if (value !== undefined && value !== '') params.set(key, value);
    }
  }
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

/** Parse CarbonPura context from current location search string. */
export function parseCarbonPuraContext(search: string): {
  isCarbonPuraContext: boolean;
  projectId: string;
  sourceSuite: string | null;
} {
  const params = new URLSearchParams(search.startsWith('?') ? search : `?${search}`);
  const partner = params.get('partner');
  const isCarbonPuraContext = partner === CARBONPURA_PARTNER_KEY;
  return {
    isCarbonPuraContext,
    projectId: params.get('projectId') || CARBONPURA_DEFAULT_PROJECT_ID,
    sourceSuite: params.get('sourceSuite'),
  };
}

/** Re-export canonical routes used in PACE suite routing. */
export const CARBONPURA_MODULE_ROUTES = {
  plasticWatch: VIEW_PATHS.hyperspectralPlasticWatch,
  aquaScan: VIEW_PATHS.aquaScanWater,
  waterMonitor: VIEW_PATHS.waterOperationsEngine,
  forestIntegrity: VIEW_PATHS.forestIntegrity,
  airQuality: VIEW_PATHS.airQualityMonitor,
  carbonMrv: VIEW_PATHS.carbonMRV,
} as const;
