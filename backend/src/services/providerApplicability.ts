/**
 * DPAL Global Provider Routing — capability registry + region check helper.
 *
 * Purpose:
 *   - DPAL is global. Most providers (FloodGuard, Open-Meteo, RainViewer, …) run everywhere.
 *   - A small number of providers (USGS Water Services, NOAA/NWS) only have data for U.S. territory.
 *   - A small number of providers (GeoLedger / Geoapify) require an API key.
 *
 * This file:
 *   - Provides a rough region check (U.S. + territories) that is *only* used to decide
 *     whether U.S.-specific providers should be called for a given coordinate.
 *   - Provides a per-provider capability record + applicability decision.
 *
 * Important constraints (do NOT loosen without product approval):
 *   - This module MUST NOT block international use of DPAL.
 *   - "Not applicable" for a regional provider is NOT a system failure.
 *   - Missing API key is NOT a system failure; it is a configuration state.
 *   - Global providers always remain available for any coordinate.
 */
export type ProviderScope =
  | "global"
  | "regional"
  | "country_specific"
  | "configured_only";

export type Coordinates = { lat: number; lng: number };

export type ApplicabilityOptions = {
  /**
   * If a specific provider-native site id is supplied (e.g. USGS NWIS site `01646500`),
   * the provider applies even if the coordinate is outside the provider's region.
   */
  usgsSite?: string;
  /**
   * Operator override that forces a provider to apply regardless of region.
   * Used sparingly (e.g. cross-border investigations, testing).
   */
  force?: boolean;
};

export type ApplicabilityReason =
  | "outside_region"
  | "missing_api_key"
  | "provider_disabled";

export type ApplicabilityResult =
  | { applicable: true; reason: null; message: null }
  | {
      applicable: false;
      reason: ApplicabilityReason;
      message: string;
    };

export interface ProviderCapability {
  providerName: string;
  scope: ProviderScope;
  regions?: string[];
  requiresApiKey?: boolean;
  appliesTo(coords: Coordinates, options: ApplicabilityOptions): boolean;
  skipReason(coords: Coordinates, options: ApplicabilityOptions): ApplicabilityResult;
}

/**
 * Rough bounding boxes for U.S. + territories. These are intentionally generous and only
 * used to decide whether U.S.-only providers like USGS NWIS and NOAA/NWS should be called.
 *
 * A coordinate landing in these boxes may not actually be a U.S. location (boxes overlap
 * neighboring coastal water and a tiny strip of bordering countries). That is acceptable:
 * the worst outcome is that a U.S. provider gets called for a near-border coordinate and
 * legitimately returns no_data — much better than refusing to run for an actual U.S. site.
 */
const US_REGION_BOXES: Array<{
  name: string;
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}> = [
  // Continental U.S. (lower 48)
  {
    name: "us_continental",
    minLat: 24.396308,
    maxLat: 49.384358,
    minLng: -124.848974,
    maxLng: -66.885444,
  },
  // Alaska (main body)
  {
    name: "us_alaska",
    minLat: 51.214,
    maxLat: 71.5388,
    minLng: -179.148909,
    maxLng: -129.974167,
  },
  // Alaska Aleutian wrap (east of the dateline)
  {
    name: "us_alaska_aleutian_east_of_dateline",
    minLat: 51.0,
    maxLat: 56.0,
    minLng: 172.0,
    maxLng: 180.0,
  },
  // Hawaii
  {
    name: "us_hawaii",
    minLat: 18.910361,
    maxLat: 22.236428,
    minLng: -160.247,
    maxLng: -154.752,
  },
  // Puerto Rico + U.S. Virgin Islands
  {
    name: "us_pr_usvi",
    minLat: 17.6,
    maxLat: 18.6,
    minLng: -68.0,
    maxLng: -64.5,
  },
  // Guam + Northern Mariana Islands
  {
    name: "us_guam_cnmi",
    minLat: 12.9,
    maxLat: 20.6,
    minLng: 144.5,
    maxLng: 146.1,
  },
  // American Samoa
  {
    name: "us_american_samoa",
    minLat: -14.6,
    maxLat: -14.1,
    minLng: -171.1,
    maxLng: -169.4,
  },
];

/**
 * Decide whether (lat, lng) is *plausibly* inside U.S. territory using rough bounding boxes.
 *
 * This is ONLY for deciding whether U.S.-specific providers (USGS, NWS) should be called.
 * It MUST NOT be used to gate the overall packet, restrict international users, or imply
 * that DPAL is U.S.-only.
 */
export function isLikelyUsOrTerritoryCoordinate(lat: number, lng: number): boolean {
  const la = Number(lat);
  const ln = Number(lng);
  if (!Number.isFinite(la) || !Number.isFinite(ln)) return false;
  for (const box of US_REGION_BOXES) {
    if (la >= box.minLat && la <= box.maxLat && ln >= box.minLng && ln <= box.maxLng) {
      return true;
    }
  }
  return false;
}

function hasUsgsSite(options: ApplicabilityOptions): boolean {
  return typeof options.usgsSite === "string" && options.usgsSite.trim().length > 0;
}

const FLOODGUARD_CAPABILITY: ProviderCapability = {
  providerName: "FloodGuard",
  scope: "global",
  appliesTo: () => true,
  skipReason: () => ({ applicable: true, reason: null, message: null }),
};

const USGS_CAPABILITY: ProviderCapability = {
  providerName: "USGS",
  scope: "country_specific",
  regions: ["US", "US_TERRITORIES"],
  appliesTo: (coords, options) => {
    if (options.force) return true;
    if (hasUsgsSite(options)) return true;
    return isLikelyUsOrTerritoryCoordinate(coords.lat, coords.lng);
  },
  skipReason: (coords, options) => {
    if (
      options.force ||
      hasUsgsSite(options) ||
      isLikelyUsOrTerritoryCoordinate(coords.lat, coords.lng)
    ) {
      return { applicable: true, reason: null, message: null };
    }
    return {
      applicable: false,
      reason: "outside_region",
      message:
        "USGS Water Services are U.S.-focused and were not used for this coordinate. DPAL continued with global providers.",
    };
  },
};

const NWS_CAPABILITY: ProviderCapability = {
  providerName: "NWS",
  scope: "country_specific",
  regions: ["US", "US_TERRITORIES"],
  appliesTo: (coords, options) => {
    if (options.force) return true;
    return isLikelyUsOrTerritoryCoordinate(coords.lat, coords.lng);
  },
  skipReason: (coords, options) => {
    if (options.force || isLikelyUsOrTerritoryCoordinate(coords.lat, coords.lng)) {
      return { applicable: true, reason: null, message: null };
    }
    return {
      applicable: false,
      reason: "outside_region",
      message:
        "NOAA/NWS active alerts are U.S.-focused and were not used for this coordinate. DPAL continued with global providers.",
    };
  },
};

const GEOLEDGER_CAPABILITY: ProviderCapability = {
  providerName: "GeoLedger",
  scope: "configured_only",
  requiresApiKey: true,
  appliesTo: () => Boolean(process.env.GEOAPIFY_API_KEY),
  skipReason: () => {
    if (process.env.GEOAPIFY_API_KEY) {
      return { applicable: true, reason: null, message: null };
    }
    return {
      applicable: false,
      reason: "missing_api_key",
      message:
        "GeoLedger location validation is not configured. Set GEOAPIFY_API_KEY to enable this provider.",
    };
  },
};

const REGISTRY: Record<string, ProviderCapability> = {
  FloodGuard: FLOODGUARD_CAPABILITY,
  USGS: USGS_CAPABILITY,
  NWS: NWS_CAPABILITY,
  GeoLedger: GEOLEDGER_CAPABILITY,
};

export function getProviderCapability(name: string): ProviderCapability | null {
  return REGISTRY[name] ?? null;
}

/**
 * Decide whether a provider should run for a given coordinate.
 * Unknown provider names return `applicable: true` so introducing a new provider does not
 * accidentally block it before its capability is registered.
 */
export function getProviderApplicability(
  name: string,
  coords: Coordinates,
  options: ApplicabilityOptions = {},
): ApplicabilityResult {
  const cap = REGISTRY[name];
  if (!cap) return { applicable: true, reason: null, message: null };
  return cap.skipReason(coords, options);
}

export function listProviderCapabilities(): ProviderCapability[] {
  return Object.values(REGISTRY);
}
