import crypto from "crypto";
import { z } from "zod";
import { recordProviderCallEvent } from "./providerCallMonitor";
import {
  buildProviderRequestKey,
  DEFAULT_COOLDOWN_MS,
  recordProviderSkip,
  runGuardedProviderCall,
  roundCoord3,
  setProviderCooldown,
} from "./providerRequestGuards";
import { getProviderApplicability } from "./providerApplicability";

type Coordinates = { lat: number; lng: number };

type ProviderStatus = {
  key: string;
  label: string;
  configured: boolean;
  purpose: string;
  mode: "live" | "needs_key" | "optional" | "disabled";
};

const DEBUG = process.env.DPAL_API_DEBUG === "true";
const FLOODGUARD_CACHE_TTL_MS = 30 * 60 * 1000;
const FLOODGUARD_CACHE_TTL_MINUTES = 30;

type FloodGuardCacheEntry = {
  value: any;
  storedAt: number;
  expiresAt: number;
};

const floodGuardCache = new Map<string, FloodGuardCacheEntry>();

function dlog(...args: unknown[]) {
  if (DEBUG) console.warn("[DPAL integrations]", ...args);
}

function sha256(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex");
}

function getFloodGuardCacheKey(lat: number, lng: number): string {
  const roundedLat = Number(lat).toFixed(3);
  const roundedLng = Number(lng).toFixed(3);
  return `floodguard:${roundedLat}:${roundedLng}`;
}

function getFloodGuardCacheEntry(lat: number, lng: number): FloodGuardCacheEntry | null {
  const key = getFloodGuardCacheKey(lat, lng);
  return floodGuardCache.get(key) ?? null;
}

function getCachedFloodGuard(lat: number, lng: number): FloodGuardCacheEntry | null {
  const entry = getFloodGuardCacheEntry(lat, lng);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) return null;
  return entry;
}

function setCachedFloodGuard(lat: number, lng: number, value: unknown): FloodGuardCacheEntry {
  const now = Date.now();
  const entry: FloodGuardCacheEntry = {
    value,
    storedAt: now,
    expiresAt: now + FLOODGUARD_CACHE_TTL_MS,
  };
  floodGuardCache.set(getFloodGuardCacheKey(lat, lng), entry);
  return entry;
}

function isRateLimitError(err: unknown): boolean {
  const msg = String(err instanceof Error ? err.message : err ?? "").toLowerCase();
  return (
    msg.includes("429") ||
    msg.includes("rate limit") ||
    msg.includes("daily api request limit exceeded") ||
    msg.includes("too many requests")
  );
}

function sanitizeProviderError(err: unknown): string {
  const raw = String(err instanceof Error ? err.message : err ?? "provider error");
  return raw.replace(/\s+/g, " ").trim().slice(0, 220);
}

async function fetchJson<T>(url: string, init?: RequestInit, timeoutMs = 12_000): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`HTTP ${res.status} from ${new URL(url).hostname}${body ? ` — ${body.slice(0, 180)}` : ""}`);
    }
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

export function getProviderStatus(): ProviderStatus[] {
  return [
    {
      key: "open_meteo",
      label: "Open-Meteo",
      configured: true,
      purpose: "Weather forecast, precipitation, runoff, and FloodGuard risk inputs.",
      mode: "live",
    },
    {
      key: "rainviewer",
      label: "RainViewer",
      configured: true,
      purpose: "Radar frame metadata and map tile URLs for flood/storm overlays.",
      mode: "live",
    },
    {
      key: "openaq",
      label: "OpenAQ",
      configured: Boolean(process.env.OPENAQ_API_KEY),
      purpose: "Air-quality sensor readings for pollution anomaly monitoring.",
      mode: process.env.OPENAQ_API_KEY ? "live" : "needs_key",
    },
    {
      key: "geoapify",
      label: "Geoapify",
      configured: Boolean(process.env.GEOAPIFY_API_KEY),
      purpose: "Forward/reverse geocoding and GeoLedger coordinate confidence.",
      mode: process.env.GEOAPIFY_API_KEY ? "live" : "needs_key",
    },
    {
      key: "climatiq",
      label: "Climatiq",
      configured: Boolean(process.env.CLIMATIQ_API_KEY),
      purpose: "CO2e activity estimates for MRV and VIU pre-screening.",
      mode: process.env.CLIMATIQ_API_KEY ? "live" : "needs_key",
    },
    {
      key: "carbon_interface",
      label: "Carbon Interface",
      configured: Boolean(process.env.CARBON_INTERFACE_API_KEY),
      purpose: "Optional secondary carbon estimate provider for cross-checking.",
      mode: process.env.CARBON_INTERFACE_API_KEY ? "live" : "optional",
    },
    {
      key: "etherscan_v2",
      label: "Etherscan V2",
      configured: Boolean(process.env.ETHERSCAN_API_KEY),
      purpose: "External chain transaction verification for anchored evidence hashes.",
      mode: process.env.ETHERSCAN_API_KEY ? "live" : "needs_key",
    },
    {
      key: "usgs_water",
      label: "USGS Water Services",
      configured: true,
      purpose: "NWIS instantaneous values for streamflow, gage height, and water temperature.",
      mode: "live",
    },
    {
      key: "nws_alerts",
      label: "NOAA/NWS Alerts",
      configured: true,
      purpose: "Official U.S. weather alerts for alert cross-checking and evidence packets.",
      mode: "live",
    },
  ];
}

const NWS_ACTIVE_ALERTS_PACKET_TYPE = "DPAL_NWS_ACTIVE_ALERTS_PACKET_V0_1" as const;
const NWS_ACTIVE_ALERTS_METHOD =
  "DPAL NWS Alerts v0.1 = official NWS active alerts normalized into a DPAL advisory packet.";
const NWS_ALERTS_CLAIM_SAFETY = {
  validatorReviewed: false,
  publicClaimAllowed: false,
  warning:
    "NWS alert content is official source data. DPAL packet is advisory packaging and does not replace official emergency instructions.",
} as const;

export type NwsActiveAlertsInput = {
  lat: number;
  lng: number;
  label?: string;
};

type NwsSeverity = "Extreme" | "Severe" | "Moderate" | "Minor" | "Unknown";

const NWS_SEVERITY_RANK: Record<NwsSeverity, number> = {
  Unknown: 0,
  Minor: 1,
  Moderate: 2,
  Severe: 3,
  Extreme: 4,
};

function normalizeNwsSeverity(raw: unknown): NwsSeverity {
  const s = String(raw ?? "").trim().toLowerCase();
  if (s === "extreme") return "Extreme";
  if (s === "severe") return "Severe";
  if (s === "moderate") return "Moderate";
  if (s === "minor") return "Minor";
  return "Unknown";
}

function computeHighestNwsSeverity(
  alerts: Array<{ severity: string | null | undefined }>
): NwsSeverity | null {
  if (alerts.length === 0) return null;
  let highest: NwsSeverity = "Unknown";
  for (const alert of alerts) {
    const normalized = normalizeNwsSeverity(alert.severity);
    if (NWS_SEVERITY_RANK[normalized] > NWS_SEVERITY_RANK[highest]) highest = normalized;
  }
  return highest;
}

/**
 * NOAA/NWS active weather alerts by point, normalized into a DPAL advisory packet.
 */
export async function getNwsActiveAlertsPacket(input: NwsActiveAlertsInput) {
  const lat = Number(input.lat);
  const lng = Number(input.lng);
  const coordinates = { lat, lng };
  const label = typeof input.label === "string" && input.label.trim() ? input.label.trim() : undefined;
  const generatedAt = new Date().toISOString();

  const hashPacket = (payload: Record<string, unknown>) =>
    sha256(
      JSON.stringify({
        type: NWS_ACTIVE_ALERTS_PACKET_TYPE,
        generatedAt,
        ...payload,
      })
    );

  try {
    const params = new URLSearchParams({ point: `${lat},${lng}` });
    const data = await fetchJson<any>(`https://api.weather.gov/alerts/active?${params.toString()}`, {
      headers: {
        "User-Agent": "DPAL/1.0 (contact: admin@dpal.local)",
        Accept: "application/geo+json",
      },
    });

    const features = Array.isArray(data?.features) ? data.features : [];
    const activeAlerts = features.map((feature: any) => {
      const p = feature?.properties ?? {};
      return {
        id: feature?.id ?? null,
        event: p?.event ?? null,
        headline: p?.headline ?? null,
        description: p?.description ?? null,
        instruction: p?.instruction ?? null,
        severity: p?.severity ?? null,
        urgency: p?.urgency ?? null,
        certainty: p?.certainty ?? null,
        effective: p?.effective ?? null,
        expires: p?.expires ?? null,
        senderName: p?.senderName ?? null,
        areaDesc: p?.areaDesc ?? null,
        status: p?.status ?? null,
        messageType: p?.messageType ?? null,
        category: p?.category ?? null,
        response: p?.response ?? null,
      };
    });

    const alertCount = activeAlerts.length;
    const highestSeverity = computeHighestNwsSeverity(activeAlerts);
    const status = alertCount > 0 ? ("ok" as const) : ("no_active_alerts" as const);

    return {
      packetType: NWS_ACTIVE_ALERTS_PACKET_TYPE,
      source: "NOAA/National Weather Service",
      coordinates,
      ...(label ? { label } : {}),
      generatedAt,
      alertCount,
      highestSeverity,
      activeAlerts,
      status,
      method: NWS_ACTIVE_ALERTS_METHOD,
      evidenceHash: hashPacket({
        coordinates,
        ...(label ? { label } : {}),
        alertCount,
        highestSeverity,
        activeAlerts,
        status,
      }),
      claimSafety: { ...NWS_ALERTS_CLAIM_SAFETY },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "NWS active alerts request failed.";
    const status = "error" as const;
    return {
      packetType: NWS_ACTIVE_ALERTS_PACKET_TYPE,
      source: "NOAA/National Weather Service",
      coordinates,
      ...(label ? { label } : {}),
      generatedAt,
      alertCount: 0,
      highestSeverity: null,
      activeAlerts: [],
      status,
      message,
      method: NWS_ACTIVE_ALERTS_METHOD,
      evidenceHash: hashPacket({
        coordinates,
        ...(label ? { label } : {}),
        alertCount: 0,
        highestSeverity: null,
        activeAlerts: [],
        status,
        message,
      }),
      claimSafety: { ...NWS_ALERTS_CLAIM_SAFETY },
    };
  }
}

/**
 * Open-Meteo weather + hydrology-style signal inputs.
 */
export async function getOpenMeteoForecast({ lat, lng }: Coordinates) {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lng),
    timezone: "auto",
    forecast_days: "3",
    hourly: [
      "precipitation",
      "rain",
      "showers",
      "soil_moisture_0_to_1cm",
      "soil_moisture_1_to_3cm",
      "relative_humidity_2m",
      "wind_speed_10m",
    ].join(","),
  });

  return fetchJson<any>(`https://api.open-meteo.com/v1/forecast?${params.toString()}`);
}

/**
 * RainViewer radar metadata. DPAL front-end can render tile URLs using host + path.
 */
export async function getRainViewerRadar() {
  const data = await fetchJson<any>("https://api.rainviewer.com/public/weather-maps.json");
  const past = Array.isArray(data?.radar?.past) ? data.radar.past : [];
  const nowcast = Array.isArray(data?.radar?.nowcast) ? data.radar.nowcast : [];
  const latest = [...past, ...nowcast].sort((a, b) => Number(b.time || 0) - Number(a.time || 0))[0];

  return {
    generated: data.generated,
    host: data.host,
    frameCount: past.length + nowcast.length,
    latestFrame: latest ?? null,
    latestTileTemplate: latest
      ? `${data.host}${latest.path}/512/{z}/{x}/{y}/2/1_1.png`
      : null,
    latestCoordinateTileExample: latest
      ? `${data.host}${latest.path}/512/6/{lat}/{lng}/2/1_1.png`
      : null,
  };
}

function scoreFloodRisk(hourly: any) {
  const precipitation: number[] = Array.isArray(hourly?.precipitation) ? hourly.precipitation : [];
  const rain: number[] = Array.isArray(hourly?.rain) ? hourly.rain : [];
  const showers: number[] = Array.isArray(hourly?.showers) ? hourly.showers : [];
  // Keep surface runoff as optional legacy input. If absent, treat as 0.
  const runoff: number[] = Array.isArray(hourly?.surface_runoff) ? hourly.surface_runoff : [];
  const soilMoistureTop: number[] = Array.isArray(hourly?.soil_moisture_0_to_1cm) ? hourly.soil_moisture_0_to_1cm : [];
  const soilMoistureShallow: number[] = Array.isArray(hourly?.soil_moisture_1_to_3cm) ? hourly.soil_moisture_1_to_3cm : [];

  const next24Precip = precipitation.slice(0, 24).reduce((a, b) => a + Number(b || 0), 0);
  const next24Rain = rain.slice(0, 24).reduce((a, b) => a + Number(b || 0), 0);
  const next24Showers = showers.slice(0, 24).reduce((a, b) => a + Number(b || 0), 0);
  const next24Runoff = runoff.slice(0, 24).reduce((a, b) => a + Number(b || 0), 0);
  const maxHourlyRain = Math.max(0, ...rain.slice(0, 24).map(Number));
  const avgSoilTop =
    soilMoistureTop.length > 0
      ? soilMoistureTop.slice(0, 24).reduce((a, b) => a + Number(b || 0), 0) / Math.min(24, soilMoistureTop.length)
      : 0;
  const avgSoilShallow =
    soilMoistureShallow.length > 0
      ? soilMoistureShallow.slice(0, 24).reduce((a, b) => a + Number(b || 0), 0) / Math.min(24, soilMoistureShallow.length)
      : 0;
  const saturationFactor = Math.max(0, Math.min(1, (avgSoilTop + avgSoilShallow) / 2));

  let score = 0;
  score += Math.min(35, next24Precip * 1.2);
  score += Math.min(25, next24Rain * 1.1);
  score += Math.min(15, next24Showers * 1.0);
  score += Math.min(10, saturationFactor * 10);
  // Optional legacy runoff signal: keep contribution if available, otherwise zero.
  score += Math.min(15, next24Runoff * 3);
  score += Math.min(15, maxHourlyRain * 2);

  const normalized = Math.max(0, Math.min(100, Math.round(score)));
  const level =
    normalized >= 75 ? "critical" :
    normalized >= 55 ? "high" :
    normalized >= 30 ? "moderate" :
    "low";

  return {
    score: normalized,
    level,
    next24PrecipMm: Number(next24Precip.toFixed(2)),
    next24RainMm: Number(next24Rain.toFixed(2)),
    next24RunoffMm: Number(next24Runoff.toFixed(2)),
    maxHourlyRainMm: Number(maxHourlyRain.toFixed(2)),
    method: "DPAL FloodGuard v0.2 = precipitation + rain + showers + soil moisture saturation. Advisory only until calibrated locally.",
  };
}

export async function getFloodRisk(coords: Coordinates) {
  const [forecast, radar] = await Promise.all([
    getOpenMeteoForecast(coords),
    getRainViewerRadar().catch((err) => {
      dlog("RainViewer failed", err?.message);
      return null;
    }),
  ]);

  return {
    source: "Open-Meteo + RainViewer",
    coordinates: coords,
    generatedAt: new Date().toISOString(),
    floodRisk: scoreFloodRisk(forecast.hourly),
    radar,
    forecastSummary: {
      timezone: forecast.timezone,
      elevation: forecast.elevation,
      firstHour: forecast.hourly?.time?.[0],
      hourlyCount: forecast.hourly?.time?.length ?? 0,
    },
  };
}

async function getFloodGuardForWaterPacket(coords: Coordinates) {
  const freshCached = getCachedFloodGuard(coords.lat, coords.lng);
  if (freshCached) {
    recordProviderCallEvent({
      providerName: "FloodGuard",
      operation: "water_packet_forecast",
      requestKey: getFloodGuardCacheKey(coords.lat, coords.lng),
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      durationMs: 0,
      status: "cache_hit",
      errorType: null,
      source: "water_alert_evidence_packet",
      latRounded3: roundCoord3(coords.lat),
      lngRounded3: roundCoord3(coords.lng),
    });
    return {
      ...(freshCached.value as Record<string, unknown>),
      status: "ok" as const,
      cacheStatus: "hit" as const,
      cachedAt: new Date(freshCached.storedAt).toISOString(),
      cacheTtlMinutes: FLOODGUARD_CACHE_TTL_MINUTES,
    };
  }

  const latR = roundCoord3(coords.lat);
  const lngR = roundCoord3(coords.lng);
  const fgKey = buildProviderRequestKey("FloodGuard", "water_packet_forecast", {
    latRounded3: latR,
    lngRounded3: lngR,
  });

  const floodCooldownUnavailable = () => ({
    status: "unavailable" as const,
    source: "Open-Meteo + RainViewer",
    errorType: "provider_error" as const,
    message:
      "FloodGuard live fetch skipped (server provider cooldown). Water packet continues with other modules where available.",
    originalError: "cooldown",
    floodRisk: {
      score: null,
      level: "unavailable",
      next24PrecipMm: null,
      next24RainMm: null,
      next24RunoffMm: null,
      maxHourlyRainMm: null,
      method: "FloodGuard unavailable for this packet — live fetch in cooldown.",
    },
    radar: null,
    forecastSummary: null,
    cacheStatus: "miss" as const,
    cacheTtlMinutes: FLOODGUARD_CACHE_TTL_MINUTES,
  });

  return runGuardedProviderCall({
    key: fgKey,
    providerName: "FloodGuard",
    operation: "water_packet_forecast",
    latRounded3: latR,
    lngRounded3: lngR,
    source: "water_alert_evidence_packet",
    rateLimitCooldownMs: DEFAULT_COOLDOWN_MS.FloodGuard_rate,
    errorCooldownMs: DEFAULT_COOLDOWN_MS.FloodGuard_error,
    onCooldown: async () => {
      const stale = getFloodGuardCacheEntry(coords.lat, coords.lng);
      if (stale) {
        return {
          ...(stale.value as Record<string, unknown>),
          status: "ok" as const,
          cacheStatus: "stale_fallback" as const,
          cachedAt: new Date(stale.storedAt).toISOString(),
          cacheTtlMinutes: FLOODGUARD_CACHE_TTL_MINUTES,
          warning: "FloodGuard live fetch in cooldown; using cached result.",
        };
      }
      return floodCooldownUnavailable();
    },
    fn: async () => {
      try {
        const fresh = await getFloodRisk(coords);
        const stored = setCachedFloodGuard(coords.lat, coords.lng, fresh);
        return {
          ...fresh,
          status: "ok" as const,
          cacheStatus: "fresh" as const,
          cachedAt: new Date(stored.storedAt).toISOString(),
          cacheTtlMinutes: FLOODGUARD_CACHE_TTL_MINUTES,
        };
      } catch (err: unknown) {
        if (isRateLimitError(err)) {
          setProviderCooldown("FloodGuard", fgKey, "rate_limited", DEFAULT_COOLDOWN_MS.FloodGuard_rate);
        } else {
          setProviderCooldown("FloodGuard", fgKey, "provider_error", DEFAULT_COOLDOWN_MS.FloodGuard_error);
        }
        const stale = getFloodGuardCacheEntry(coords.lat, coords.lng);
        if (stale) {
          return {
            ...(stale.value as Record<string, unknown>),
            status: "ok" as const,
            cacheStatus: "stale_fallback" as const,
            cachedAt: new Date(stale.storedAt).toISOString(),
            cacheTtlMinutes: FLOODGUARD_CACHE_TTL_MINUTES,
            warning: "FloodGuard provider failed; using cached result.",
          };
        }

        return {
          status: "unavailable" as const,
          source: "Open-Meteo + RainViewer",
          errorType: isRateLimitError(err) ? ("rate_limited" as const) : ("provider_error" as const),
          message:
            "FloodGuard provider temporarily unavailable. Water packet generated with remaining sources.",
          originalError: sanitizeProviderError(err),
          floodRisk: {
            score: null,
            level: "unavailable",
            next24PrecipMm: null,
            next24RainMm: null,
            next24RunoffMm: null,
            maxHourlyRainMm: null,
            method: "FloodGuard unavailable for this packet due to provider error.",
          },
          radar: null,
          forecastSummary: null,
          cacheStatus: "miss" as const,
          cacheTtlMinutes: FLOODGUARD_CACHE_TTL_MINUTES,
        };
      }
    },
  });
}

/**
 * OpenAQ v3. Requires OPENAQ_API_KEY.
 * Uses nearby coordinates through locations endpoint, then fetches latest for the first location.
 */
export async function getAirQuality({ lat, lng }: Coordinates) {
  const apiKey = process.env.OPENAQ_API_KEY;
  if (!apiKey) {
    return {
      configured: false,
      source: "OpenAQ",
      status: "needs_key",
      message: "Set OPENAQ_API_KEY in Railway to enable live air-quality readings.",
    };
  }

  const locationParams = new URLSearchParams({
    coordinates: `${lat},${lng}`,
    radius: "25000",
    limit: "5",
  });

  const locations = await fetchJson<any>(
    `https://api.openaq.org/v3/locations?${locationParams.toString()}`,
    { headers: { "X-API-Key": apiKey } }
  );

  const first = locations?.results?.[0];
  if (!first?.id) {
    return {
      configured: true,
      source: "OpenAQ",
      status: "no_nearby_sensor",
      coordinates: { lat, lng },
      readings: [],
    };
  }

  const latest = await fetchJson<any>(
    `https://api.openaq.org/v3/locations/${first.id}/latest`,
    { headers: { "X-API-Key": apiKey } }
  );

  const readingsRaw = Array.isArray(latest?.results) ? latest.results : [];
  const sensorMetadataMap = await buildOpenAqSensorMetadataMap([Number(first.id)], apiKey);
  const locCtx = first as Record<string, unknown>;
  const readings: Record<string, unknown>[] = readingsRaw.map((r: unknown) =>
    stripParameterMatchKey([
      buildSatelliteOpenAqRow(locCtx, r as Record<string, unknown>, sensorMetadataMap),
    ])[0]
  );

  const pm25 = readings.find((r) => {
    const id = extractOpenAqParameterIdentifier(r);
    return id != null && openAqParameterMatches(id, "pm25");
  });

  const value = Number(pm25?.value ?? NaN);
  const risk =
    Number.isFinite(value) && value >= 150 ? "critical" :
    Number.isFinite(value) && value >= 75 ? "high" :
    Number.isFinite(value) && value >= 35 ? "moderate" :
    Number.isFinite(value) ? "low" :
    "unknown";

  return {
    configured: true,
    source: "OpenAQ",
    location: {
      id: first.id,
      name: first.name,
      locality: first.locality,
      country: first.country,
      coordinates: first.coordinates,
    },
    risk,
    pm25: Number.isFinite(value) ? {
      value,
      unit: pm25?.unit,
      datetime: pm25?.datetime,
    } : null,
    readings,
  };
}

const SECRET_KEY_PATTERN = /^(authorization|cookie|apikey|api_key|x-api-key|token|secret|password|bearer)$/i;

function stripSecretLikeKeysFromSample(value: unknown): unknown {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(stripSecretLikeKeysFromSample);
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (SECRET_KEY_PATTERN.test(k)) continue;
    out[k] =
      v != null && typeof v === "object"
        ? stripSecretLikeKeysFromSample(v)
        : v;
  }
  return out;
}

function collectOpenAqReadingNestedKeyMap(reading: Record<string, unknown> | null): {
  nestedKeys: Record<string, string[]>;
  secondLevelNestedKeys: Record<string, Record<string, string[]>>;
} {
  const nestedKeys: Record<string, string[]> = {};
  const secondLevelNestedKeys: Record<string, Record<string, string[]>> = {};
  if (!reading) return { nestedKeys, secondLevelNestedKeys };

  for (const [k, v] of Object.entries(reading)) {
    if (v != null && typeof v === "object" && !Array.isArray(v)) {
      nestedKeys[k] = Object.keys(v as object);
      const inner: Record<string, string[]> = {};
      for (const [ik, iv] of Object.entries(v as Record<string, unknown>)) {
        if (iv != null && typeof iv === "object" && !Array.isArray(iv)) {
          inner[ik] = Object.keys(iv as object);
        }
      }
      if (Object.keys(inner).length > 0) secondLevelNestedKeys[k] = inner;
    }
  }
  return { nestedKeys, secondLevelNestedKeys };
}

/**
 * Temporary debug helper: inspect OpenAQ v3 JSON shapes for locations + latest (no API key in response).
 * Remove when satellite-validation mapping is stable.
 */
export async function getOpenAqDebugSnapshot(lat: number, lng: number) {
  const apiKey = process.env.OPENAQ_API_KEY;
  if (!apiKey) {
    return {
      ok: true as const,
      status: "needs_key" as const,
      message: "Set OPENAQ_API_KEY in Railway.",
    };
  }

  const locationParams = new URLSearchParams({
    coordinates: `${lat},${lng}`,
    radius: "25000",
    limit: "3",
  });

  const locations = await fetchJson<any>(
    `https://api.openaq.org/v3/locations?${locationParams.toString()}`,
    { headers: { "X-API-Key": apiKey } }
  );

  const results: any[] = Array.isArray(locations?.results) ? locations.results : [];
  const firstWithId = results.find((r) => r?.id != null);

  if (!firstWithId) {
    return {
      ok: true as const,
      status: "ok" as const,
      message: "No location with id in OpenAQ results.",
      locationKeys: [] as string[],
      firstLocationSample: null,
      latestTopLevelKeys: [] as string[],
      latestResultCount: 0,
      latestFirstResultKeys: [] as string[],
      latestFirstResultRaw: null,
      latestFirstResultNestedKeys: {} as Record<string, string[]>,
      latestFirstResultSecondLevelNestedKeys: {} as Record<string, Record<string, string[]>>,
    };
  }

  const firstLocation = firstWithId;
  const latest = await fetchJson<any>(
    `https://api.openaq.org/v3/locations/${firstLocation.id}/latest`,
    { headers: { "X-API-Key": apiKey } }
  );

  const latestResults: any[] = Array.isArray(latest?.results) ? latest.results : [];
  const firstReading =
    latestResults.length > 0 && latestResults[0] != null && typeof latestResults[0] === "object"
      ? (latestResults[0] as Record<string, unknown>)
      : null;

  const { nestedKeys, secondLevelNestedKeys } = collectOpenAqReadingNestedKeyMap(firstReading);

  return {
    ok: true as const,
    status: "ok" as const,
    locationIdUsed: firstLocation.id,
    locationKeys: Object.keys(firstLocation),
    firstLocationSample: stripSecretLikeKeysFromSample(firstLocation),
    latestTopLevelKeys: latest != null && typeof latest === "object" ? Object.keys(latest as object) : [],
    latestResultCount: latestResults.length,
    latestFirstResultKeys: firstReading ? Object.keys(firstReading) : [],
    latestFirstResultRaw: firstReading,
    latestFirstResultNestedKeys: nestedKeys,
    latestFirstResultSecondLevelNestedKeys: secondLevelNestedKeys,
  };
}

const SATELLITE_VALIDATION_PACKET_TYPE = "DPAL_SATELLITE_VALIDATION_V0_1";

function normalizePollutantKey(signalType: string): string {
  const s = String(signalType || "").toLowerCase().trim().replace(/\./g, "");
  if (!s) return "pm25";
  if (s.includes("pm2") || s === "pm25") return "pm25";
  if (s.includes("pm10")) return "pm10";
  if (s.includes("no2")) return "no2";
  if (s.includes("so2")) return "so2";
  if (s.includes("co")) return "co";
  if (s.includes("o3") || s.includes("ozone")) return "o3";
  return s;
}

function openAqParameterMatches(parameterRaw: unknown, key: string): boolean {
  const name = String(
    typeof parameterRaw === "object" && parameterRaw && "name" in parameterRaw
      ? (parameterRaw as { name?: string }).name
      : parameterRaw ?? ""
  )
    .toLowerCase()
    .replace(/\./g, "");

  switch (key) {
    case "pm25":
      return name.includes("pm2") || name === "pm25";
    case "pm10":
      return name.includes("pm10");
    case "no2":
      return name.includes("no2");
    case "so2":
      return name.includes("so2");
    case "co":
      return name === "co";
    case "o3":
      return name.includes("o3") || name.includes("ozone");
    default:
      return name.includes(key);
  }
}

/** OpenAQ reading shapes vary; only treat as a pollutant match when an identifier is present. */
function extractOpenAqParameterIdentifier(r: Record<string, unknown>): string | null {
  const candidates: unknown[] = [];
  const p = r.parameter;
  if (typeof p === "string") candidates.push(p);
  else if (p && typeof p === "object" && !Array.isArray(p)) {
    const po = p as Record<string, unknown>;
    candidates.push(po.name, po.displayName, po.id);
  }
  candidates.push(
    r.parameterId,
    r.parameterName,
    r.parameterDisplayName,
    r.sensorParameterName,
    r.name
  );
  for (const c of candidates) {
    if (c == null) continue;
    const s = String(c).trim();
    if (s) return s;
  }
  return null;
}

type OpenAqSensorMetaEntry = {
  parameter: {
    id?: unknown;
    name?: unknown;
    units?: unknown;
    displayName?: unknown;
  };
  datetimeFirst: unknown;
  datetimeLast: unknown;
};

function normalizeOpenAqReadingSensorId(reading: Record<string, unknown>): string | null {
  const v =
    reading.sensorId ??
    reading.sensorsId ??
    reading.sensor_id ??
    reading.sensors_id;
  if (v == null) return null;
  const s = String(v).trim();
  return s || null;
}

async function fetchOpenAqLocationSensors(locationId: number, apiKey: string): Promise<any[]> {
  try {
    const data = await fetchJson<any>(
      `https://api.openaq.org/v3/locations/${locationId}/sensors`,
      { headers: { "X-API-Key": apiKey } }
    );
    return Array.isArray(data?.results) ? data.results : [];
  } catch (err: any) {
    dlog("OpenAQ sensors failed", locationId, err?.message);
    return [];
  }
}

/**
 * sensorId -> parameter metadata from GET /locations/{id}/sensors (max 5 location ids).
 */
async function buildOpenAqSensorMetadataMap(
  locationIds: number[],
  apiKey: string
): Promise<Map<string, OpenAqSensorMetaEntry>> {
  const map = new Map<string, OpenAqSensorMetaEntry>();
  const unique = [...new Set(locationIds.filter((id) => Number.isFinite(id)))].slice(0, 5);
  for (const lid of unique) {
    const sensors = await fetchOpenAqLocationSensors(lid, apiKey);
    for (const s of sensors) {
      const sid = s?.id ?? s?.sensorId;
      if (sid == null) continue;
      const key = String(sid);
      const paramRaw = s?.parameter;
      let parameter: OpenAqSensorMetaEntry["parameter"] = {};
      if (paramRaw && typeof paramRaw === "object" && !Array.isArray(paramRaw)) {
        const po = paramRaw as Record<string, unknown>;
        parameter = {
          id: po.id,
          name: po.name,
          units: po.units,
          displayName: po.displayName,
        };
      }
      map.set(key, {
        parameter,
        datetimeFirst: s?.datetimeFirst ?? s?.datetime_first ?? null,
        datetimeLast: s?.datetimeLast ?? s?.datetime_last ?? null,
      });
    }
  }
  return map;
}

type SatelliteOpenAqReadingRowInternal = {
  locationId: unknown;
  locationName: unknown;
  locality: unknown;
  country: unknown;
  coordinates: unknown;
  parameter: unknown;
  value: unknown;
  unit: unknown;
  datetime: unknown;
  parameterName?: unknown;
  parameterDisplayName?: unknown;
  sensorDatetimeFirst?: unknown;
  sensorDatetimeLast?: unknown;
  parameterMatchKey: string | null;
};

function stripParameterMatchKey(rows: SatelliteOpenAqReadingRowInternal[]): Record<string, unknown>[] {
  return rows.map(({ parameterMatchKey: _pmk, ...rest }) => rest as Record<string, unknown>);
}

function buildSatelliteOpenAqRow(
  loc: Record<string, unknown>,
  reading: Record<string, unknown>,
  sensorMap: Map<string, OpenAqSensorMetaEntry>
): SatelliteOpenAqReadingRowInternal {
  const sid = normalizeOpenAqReadingSensorId(reading);
  const meta = sid ? sensorMap.get(sid) : undefined;

  let parameter: unknown = reading.parameter ?? null;
  let unit: unknown = reading.unit ?? null;
  let parameterName: unknown;
  let parameterDisplayName: unknown;
  let sensorDatetimeFirst: unknown;
  let sensorDatetimeLast: unknown;

  if (meta?.parameter) {
    const p = meta.parameter;
    const hasAny = ["id", "name", "units", "displayName"].some(
      (k) => p[k as keyof typeof p] != null && String(p[k as keyof typeof p]).trim() !== ""
    );
    if (hasAny) {
      parameter = {
        id: p.id,
        name: p.name,
        units: p.units,
        displayName: p.displayName,
      };
      if (p.name != null && String(p.name).trim() !== "") parameterName = p.name;
      if (p.displayName != null && String(p.displayName).trim() !== "") parameterDisplayName = p.displayName;
      unit = unit ?? p.units ?? null;
      sensorDatetimeFirst = meta.datetimeFirst;
      sensorDatetimeLast = meta.datetimeLast;
    }
  }

  const enriched: Record<string, unknown> = {
    locationId: loc.id,
    locationName: loc.name ?? null,
    locality: loc.locality ?? null,
    country: loc.country ?? null,
    coordinates: loc.coordinates ?? null,
    parameter,
    value: reading.value,
    unit,
    datetime: reading.datetime ?? null,
  };
  if (parameterName !== undefined) enriched.parameterName = parameterName;
  if (parameterDisplayName !== undefined) enriched.parameterDisplayName = parameterDisplayName;
  if (sensorDatetimeFirst !== undefined) enriched.sensorDatetimeFirst = sensorDatetimeFirst;
  if (sensorDatetimeLast !== undefined) enriched.sensorDatetimeLast = sensorDatetimeLast;

  const parameterMatchKey = extractOpenAqParameterIdentifier(enriched);

  return {
    locationId: enriched.locationId,
    locationName: enriched.locationName,
    locality: enriched.locality,
    country: enriched.country,
    coordinates: enriched.coordinates,
    parameter: enriched.parameter,
    value: enriched.value,
    unit: enriched.unit,
    datetime: enriched.datetime,
    parameterName: enriched.parameterName,
    parameterDisplayName: enriched.parameterDisplayName,
    sensorDatetimeFirst: enriched.sensorDatetimeFirst,
    sensorDatetimeLast: enriched.sensorDatetimeLast,
    parameterMatchKey,
  };
}

const OPENAQ_READING_FRESH_DAYS = 30;

function parseOpenAqReadingInstant(datetimeField: unknown): Date | null {
  if (datetimeField == null) return null;
  if (typeof datetimeField === "string") {
    const d = new Date(datetimeField);
    return Number.isFinite(d.getTime()) ? d : null;
  }
  if (typeof datetimeField === "object" && !Array.isArray(datetimeField)) {
    const o = datetimeField as Record<string, unknown>;
    const utc = o.utc ?? o.UTC;
    const local = o.local ?? o.LOCAL;
    const s =
      utc != null && String(utc).trim() !== ""
        ? String(utc)
        : local != null && String(local).trim() !== ""
          ? String(local)
          : "";
    if (!s) return null;
    const d = new Date(s);
    return Number.isFinite(d.getTime()) ? d : null;
  }
  return null;
}

function openAqReadingFreshness(datetimeField: unknown): "fresh" | "stale" | "unknown" {
  const d = parseOpenAqReadingInstant(datetimeField);
  if (!d) return "unknown";
  const ageDays = (Date.now() - d.getTime()) / 86_400_000;
  return ageDays > OPENAQ_READING_FRESH_DAYS ? "stale" : "fresh";
}

export type SatelliteValidationInput = Coordinates & {
  signalType: string;
  /** Parsed numeric satellite measurement when comparable to µg/m³-style ground stats; NaN if not numeric. */
  satelliteNumeric: number;
  satelliteRaw: string;
};

/**
 * Compare a satellite or modeled environmental signal to nearby OpenAQ ground observations.
 * Advisory only until validator review — surfaces disagreement explicitly when sensors diverge.
 */
export async function getSatelliteValidation(input: SatelliteValidationInput) {
  const { lat, lng, signalType, satelliteNumeric, satelliteRaw } = input;
  const coordinates = { lat, lng };
  const pollutantKey = normalizePollutantKey(signalType);

  const advisoryNotice =
    "Advisory screening only: satellite or modeled signals compared with citizen/regulatory-grade ground sensors. No verified operational claim unless a DPAL validator completes review.";

  const apiKey = process.env.OPENAQ_API_KEY;
  if (!apiKey) {
    const payloadForHash = {
      type: SATELLITE_VALIDATION_PACKET_TYPE,
      coordinates,
      signalType: pollutantKey,
      satelliteValue: satelliteRaw,
      validationStatus: "needs_key" as const,
      status: "needs_key" as const,
    };
    return {
      status: "needs_key" as const,
      message: "Set OPENAQ_API_KEY in Railway to enable ground-level satellite validation.",
      coordinates,
      signalType: pollutantKey,
      satelliteValue: satelliteRaw,
      openAqReadings: [] as unknown[],
      validationStatus: "needs_key" as const,
      confidenceScore: 0,
      method:
        "DPAL Satellite Validation v0.1 = satellite signal compared with nearby OpenAQ ground observations.",
      evidenceHash: sha256(JSON.stringify(payloadForHash)),
      advisoryNotice,
      claimSafety: { validatorReviewed: false, publicClaimAllowed: false },
    };
  }

  const locationParams = new URLSearchParams({
    coordinates: `${lat},${lng}`,
    radius: "25000",
    limit: "8",
  });

  let locations: any;
  try {
    locations = await fetchJson<any>(
      `https://api.openaq.org/v3/locations?${locationParams.toString()}`,
      { headers: { "X-API-Key": apiKey } }
    );
  } catch (err: any) {
    dlog("OpenAQ locations failed", err?.message);
    const validationStatus = "partial" as const;
    const payloadForHash = {
      type: SATELLITE_VALIDATION_PACKET_TYPE,
      coordinates,
      signalType: pollutantKey,
      satelliteValue: satelliteRaw,
      validationStatus,
      error: String(err?.message || "openaq_error"),
    };
    return {
      message: err?.message || "OpenAQ request failed.",
      coordinates,
      signalType: pollutantKey,
      satelliteValue: satelliteRaw,
      openAqReadings: [],
      validationStatus,
      confidenceScore: 0.15,
      method:
        "DPAL Satellite Validation v0.1 = satellite signal compared with nearby OpenAQ ground observations.",
      evidenceHash: sha256(JSON.stringify(payloadForHash)),
      advisoryNotice,
      claimSafety: { validatorReviewed: false, publicClaimAllowed: false },
    };
  }

  const locResults: any[] = Array.isArray(locations?.results) ? locations.results : [];
  const openAqReadingsInternal: SatelliteOpenAqReadingRowInternal[] = [];

  const maxLocations = Math.min(5, locResults.length);
  const locationIdsForSensors: number[] = [];
  for (let i = 0; i < maxLocations; i++) {
    const loc = locResults[i];
    if (loc?.id != null && Number.isFinite(Number(loc.id))) locationIdsForSensors.push(Number(loc.id));
  }
  const sensorMetadataMap = await buildOpenAqSensorMetadataMap(locationIdsForSensors, apiKey);

  for (let i = 0; i < maxLocations; i++) {
    const loc = locResults[i];
    if (!loc?.id) continue;
    try {
      const latest = await fetchJson<any>(
        `https://api.openaq.org/v3/locations/${loc.id}/latest`,
        { headers: { "X-API-Key": apiKey } }
      );
      const readings = Array.isArray(latest?.results) ? latest.results : [];
      const locCtx = loc as Record<string, unknown>;
      for (const r of readings) {
        openAqReadingsInternal.push(
          buildSatelliteOpenAqRow(locCtx, r as Record<string, unknown>, sensorMetadataMap)
        );
      }
    } catch (err: any) {
      dlog("OpenAQ latest failed", loc.id, err?.message);
    }
  }

  const openAqReadings = stripParameterMatchKey(openAqReadingsInternal);
  const matchingParameterReadingsRows = openAqReadingsInternal.filter(
    (row) => row.parameterMatchKey != null && openAqParameterMatches(row.parameterMatchKey, pollutantKey)
  );
  const matchingParameterReadings = stripParameterMatchKey(matchingParameterReadingsRows);

  const MSG_NO_SENSOR = "No nearby OpenAQ sensor readings found within the search radius.";
  const MSG_NO_POLLUTANT_MATCH =
    "OpenAQ readings were found nearby, but no matching pollutant reading could be confirmed for the requested signalType.";
  const MSG_STALE_MATCH =
    "Matching OpenAQ readings were found, but they are stale and should not be treated as current ground validation.";
  const MSG_NON_NUM_SAT =
    "Ground readings found, but satelliteValue was not numeric enough for comparison.";
  const MSG_UNKNOWN_TS =
    "Matching readings were found, but observation timestamps could not be parsed; freshness is unknown.";

  let validationStatus: "confirmed" | "partial" | "conflicting" | "no_nearby_sensor";
  let confidenceScore = 0;
  let message: string | undefined;
  let freshnessStatus: "fresh" | "stale" | "mixed" | "unknown" | undefined;
  let groundSampleCount: number | undefined;
  let comparison:
    | { satelliteNumeric: number; groundMean: number; groundSampleCount: number }
    | undefined;

  const numericMatchingRows = matchingParameterReadingsRows.filter((row) =>
    Number.isFinite(Number(row.value))
  );
  let withFreshness: { numeric: number; freshness: "fresh" | "stale" | "unknown" }[] = [];

  if (openAqReadingsInternal.length === 0) {
    validationStatus = "no_nearby_sensor";
    confidenceScore = 0;
    message = MSG_NO_SENSOR;
  } else if (matchingParameterReadingsRows.length === 0) {
    validationStatus = "partial";
    confidenceScore = 0.12;
    message = MSG_NO_POLLUTANT_MATCH;
  } else if (numericMatchingRows.length === 0) {
    validationStatus = "partial";
    confidenceScore = 0.12;
    message =
      "Matching pollutant rows were identified, but no numeric ground concentration values were available.";
  } else {
    withFreshness = numericMatchingRows.map((row) => ({
      numeric: Number(row.value),
      freshness: openAqReadingFreshness(row.datetime),
    }));

    const freshNums = withFreshness.filter((x) => x.freshness === "fresh").map((x) => x.numeric);
    const staleNums = withFreshness.filter((x) => x.freshness === "stale").map((x) => x.numeric);
    const unknownNums = withFreshness.filter((x) => x.freshness === "unknown").map((x) => x.numeric);

    const hasFresh = freshNums.length > 0;
    const hasStale = staleNums.length > 0;
    const hasUnknown = unknownNums.length > 0;

    if (!hasFresh && hasStale && !hasUnknown) {
      validationStatus = "partial";
      freshnessStatus = "stale";
      groundSampleCount = staleNums.length;
      confidenceScore = Math.min(0.25, 0.14 + Math.min(staleNums.length, 6) * 0.018);
      message = MSG_STALE_MATCH;
    } else if (!hasFresh && !hasStale && hasUnknown) {
      validationStatus = "partial";
      freshnessStatus = "unknown";
      groundSampleCount = unknownNums.length;
      confidenceScore = Math.min(0.22, 0.12 + Math.min(unknownNums.length, 6) * 0.015);
      message = MSG_UNKNOWN_TS;
    } else if (!hasFresh && hasStale && hasUnknown) {
      validationStatus = "partial";
      freshnessStatus = "mixed";
      groundSampleCount = staleNums.length + unknownNums.length;
      confidenceScore = Math.min(0.25, 0.13 + Math.min(staleNums.length + unknownNums.length, 8) * 0.014);
      message = `${MSG_STALE_MATCH} Some observation timestamps could not be parsed.`;
    } else if (hasFresh) {
      freshnessStatus =
        hasStale || hasUnknown ? "mixed" : ("fresh" as const);

      const groundMeanFresh =
        freshNums.reduce((a, b) => a + b, 0) / Math.max(1, freshNums.length);
      groundSampleCount = freshNums.length;

      if (!Number.isFinite(satelliteNumeric)) {
        validationStatus = "partial";
        confidenceScore = Math.min(0.38, 0.16 + freshNums.length * 0.05);
        message = MSG_NON_NUM_SAT;
      } else {
        const denom = Math.max(Math.abs(satelliteNumeric), Math.abs(groundMeanFresh), 1e-6);
        const relDiff = Math.abs(satelliteNumeric - groundMeanFresh) / denom;

        if (relDiff <= 0.25) validationStatus = "confirmed";
        else if (relDiff <= 0.6) validationStatus = "partial";
        else validationStatus = "conflicting";

        const agreement = Math.max(0, 1 - Math.min(1, relDiff));
        const breadth = Math.min(1, freshNums.length / 4);
        let score = 0.5 * agreement + 0.35 * breadth;
        if (validationStatus === "confirmed") score += 0.1;
        if (validationStatus === "conflicting") score *= 0.45;
        if (hasStale || hasUnknown) score *= 0.82;
        confidenceScore = Math.round(Math.min(1, Math.max(0, score)) * 1000) / 1000;

        comparison = {
          satelliteNumeric,
          groundMean: Number(groundMeanFresh.toFixed(4)),
          groundSampleCount: freshNums.length,
        };

        if (hasStale || hasUnknown) {
          message =
            hasStale && hasUnknown
              ? "Fresh ground readings were used for comparison; additional stale or undated readings were ignored for the numeric match."
              : hasStale
                ? "Fresh ground readings were used for comparison; stale readings were retained for context only."
                : "Fresh ground readings were used for comparison; some readings had unparsed timestamps.";
        }
      }
    } else {
      validationStatus = "partial";
      confidenceScore = 0.12;
      freshnessStatus = "unknown";
      message = MSG_UNKNOWN_TS;
    }
  }

  let groundMeanForHash: number | null = comparison?.groundMean ?? null;
  if (groundMeanForHash == null && freshnessStatus === "stale" && withFreshness.length > 0) {
    const staleVals = withFreshness.filter((x) => x.freshness === "stale").map((x) => x.numeric);
    if (staleVals.length > 0) {
      groundMeanForHash = Number(
        (staleVals.reduce((a, b) => a + b, 0) / staleVals.length).toFixed(4)
      );
    }
  }

  const canCompare = Boolean(comparison);

  const payloadForHash = {
    type: SATELLITE_VALIDATION_PACKET_TYPE,
    coordinates,
    signalType: pollutantKey,
    satelliteValue: satelliteRaw,
    validationStatus,
    groundSampleCount: groundSampleCount ?? 0,
    groundMean: groundMeanForHash,
    openAqReadingCount: openAqReadings.length,
    matchingParameterCount: matchingParameterReadings.length,
    freshnessStatus: freshnessStatus ?? null,
    comparable: canCompare,
    generatedAtHour: new Date().toISOString().slice(0, 13),
  };

  return {
    coordinates,
    signalType: pollutantKey,
    satelliteValue: satelliteRaw,
    openAqReadings,
    validationStatus,
    confidenceScore,
    method:
      "DPAL Satellite Validation v0.1 = satellite signal compared with nearby OpenAQ ground observations.",
    evidenceHash: sha256(JSON.stringify(payloadForHash)),
    advisoryNotice,
    claimSafety: { validatorReviewed: false, publicClaimAllowed: false },
    ...(message ? { message } : {}),
    ...(comparison ? { comparison } : {}),
    ...(freshnessStatus ? { freshnessStatus } : {}),
    ...(groundSampleCount !== undefined ? { groundSampleCount } : {}),
    ...(matchingParameterReadings.length > 0 ? { matchingParameterReadings } : {}),
  };
}

/**
 * Geoapify forward geocoding.
 */
export async function geocodeLocation(text: string) {
  const apiKey = process.env.GEOAPIFY_API_KEY;
  if (!apiKey) {
    return {
      configured: false,
      source: "Geoapify",
      status: "needs_key",
      message: "Set GEOAPIFY_API_KEY in Railway to enable geocoding and GeoLedger confidence.",
    };
  }

  const params = new URLSearchParams({
    text,
    format: "json",
    apiKey,
  });

  const data = await fetchJson<any>(`https://api.geoapify.com/v1/geocode/search?${params.toString()}`);
  const first = data?.results?.[0];

  if (!first) {
    return { configured: true, source: "Geoapify", status: "no_match", query: text };
  }

  const geoLedgerId = sha256([
    "DPAL-GEOLEDGER-v1",
    first.lat,
    first.lon,
    first.country_code,
    first.state,
    first.city,
    first.formatted,
  ].filter(Boolean).join("|"));

  return {
    configured: true,
    source: "Geoapify",
    status: "matched",
    query: text,
    geoLedgerId,
    result: {
      formatted: first.formatted,
      lat: first.lat,
      lng: first.lon,
      country: first.country,
      state: first.state,
      city: first.city,
      confidence: first.rank?.confidence,
      confidenceCityLevel: first.rank?.confidence_city_level,
      confidenceStreetLevel: first.rank?.confidence_street_level,
      raw: first,
    },
  };
}

const GEOLEDGER_REVERSE_PACKET_TYPE = "DPAL_GEOLEDGER_REVERSE_V0_1";

const GEOLEDGER_REVERSE_METHOD =
  "DPAL GeoLedger v0.1 = coordinate reverse-geocoded and converted into a tamper-evident location identity.";

const GEOLEDGER_CLAIM_SAFETY = { validatorReviewed: false, publicClaimAllowed: false } as const;

export type GeoLedgerReverseInput = Coordinates & { label: string };

/**
 * Reverse-geocode coordinates into a structured DPAL GeoLedger location packet (Geoapify).
 * Advisory only until a DPAL validator completes review.
 */
export async function getGeoLedgerReverseLocation({ lat, lng, label }: GeoLedgerReverseInput) {
  const coordinates = { lat, lng };
  const labelTrimmed = String(label || "").trim();

  const apiKey = process.env.GEOAPIFY_API_KEY;
  if (!apiKey) {
    const payloadForHash = {
      type: GEOLEDGER_REVERSE_PACKET_TYPE,
      coordinates,
      label: labelTrimmed,
      validationStatus: "needs_key" as const,
      status: "needs_key" as const,
    };
    return {
      status: "needs_key" as const,
      validationStatus: "needs_key" as const,
      message: "Set GEOAPIFY_API_KEY in Railway to enable GeoLedger location validation.",
      coordinates,
      label: labelTrimmed || null,
      confidenceScore: 0,
      evidenceHash: sha256(JSON.stringify(payloadForHash)),
      claimSafety: { ...GEOLEDGER_CLAIM_SAFETY },
    };
  }

  const params = new URLSearchParams({
    lat: String(lat),
    lon: String(lng),
    format: "json",
    apiKey,
  });

  let data: any;
  try {
    data = await fetchJson<any>(`https://api.geoapify.com/v1/geocode/reverse?${params.toString()}`);
  } catch (err: any) {
    dlog("Geoapify reverse failed", err?.message);
    const validationStatus = "error" as const;
    const payloadForHash = {
      type: GEOLEDGER_REVERSE_PACKET_TYPE,
      coordinates,
      label: labelTrimmed,
      validationStatus,
      error: String(err?.message || "geoapify_error"),
    };
    return {
      status: "error" as const,
      validationStatus,
      message: err?.message || "Geoapify reverse geocoding request failed.",
      coordinates,
      label: labelTrimmed || null,
      formattedAddress: null,
      city: null,
      county: null,
      state: null,
      country: null,
      countryCode: null,
      postcode: null,
      distanceMeters: null,
      confidenceScore: 0,
      geoLedgerId: null,
      evidenceHash: sha256(JSON.stringify(payloadForHash)),
      method: GEOLEDGER_REVERSE_METHOD,
      claimSafety: { ...GEOLEDGER_CLAIM_SAFETY },
    };
  }

  const first = data?.results?.[0];
  if (!first) {
    const validationStatus = "no_match" as const;
    const payloadForHash = {
      type: GEOLEDGER_REVERSE_PACKET_TYPE,
      coordinates,
      label: labelTrimmed,
      validationStatus,
    };
    return {
      status: "no_match" as const,
      validationStatus,
      message: "No reverse-geocode match for these coordinates.",
      coordinates,
      label: labelTrimmed || null,
      formattedAddress: null,
      city: null,
      county: null,
      state: null,
      country: null,
      countryCode: null,
      postcode: null,
      distanceMeters: null,
      confidenceScore: 0,
      geoLedgerId: null,
      evidenceHash: sha256(JSON.stringify(payloadForHash)),
      method: GEOLEDGER_REVERSE_METHOD,
      claimSafety: { ...GEOLEDGER_CLAIM_SAFETY },
    };
  }

  const formattedAddress =
    typeof first.formatted === "string" && first.formatted.trim()
      ? first.formatted.trim()
      : null;
  const city = first.city ?? null;
  const county = first.county ?? null;
  const state = first.state ?? null;
  const country = first.country ?? null;
  const countryCode = first.country_code ?? null;
  const postcode = first.postcode ?? null;

  const resolvedLat = Number(first.lat ?? lat);
  const resolvedLng = Number(first.lon ?? lng);
  const resolvedCoords = {
    lat: Number.isFinite(resolvedLat) ? resolvedLat : lat,
    lng: Number.isFinite(resolvedLng) ? resolvedLng : lng,
  };

  let distanceMeters: number | null = null;
  const dRaw = first.distance ?? first.distance_meters;
  const dNum = Number(dRaw);
  if (Number.isFinite(dNum) && dNum >= 0) distanceMeters = dNum;

  let confidenceScore: number | null = null;
  const confRaw = first.rank?.confidence ?? first.confidence;
  const confNum = Number(confRaw);
  if (Number.isFinite(confNum)) {
    confidenceScore = confNum > 1 ? Math.min(1, confNum / 100) : Math.min(1, Math.max(0, confNum));
  }

  const geoLedgerId = sha256(
    [
      "DPAL-GEOLEDGER-v0.1-reverse",
      resolvedCoords.lat,
      resolvedCoords.lng,
      countryCode,
      state,
      city,
      county,
      formattedAddress,
    ]
      .filter((v) => v != null && v !== "")
      .join("|")
  );

  const validationStatus = "advisory" as const;
  const payloadForHash = {
    type: GEOLEDGER_REVERSE_PACKET_TYPE,
    coordinates: resolvedCoords,
    queryCoordinates: coordinates,
    label: labelTrimmed,
    validationStatus,
    formattedAddress,
    city,
    county,
    state,
    country,
    countryCode,
    postcode,
    distanceMeters,
    confidenceScore,
    geoLedgerId,
    generatedAtHour: new Date().toISOString().slice(0, 13),
  };

  return {
    status: "matched" as const,
    validationStatus,
    coordinates: resolvedCoords,
    label: labelTrimmed || null,
    formattedAddress,
    city,
    county,
    state,
    country,
    countryCode,
    postcode,
    distanceMeters,
    confidenceScore,
    geoLedgerId,
    evidenceHash: sha256(JSON.stringify(payloadForHash)),
    method: GEOLEDGER_REVERSE_METHOD,
    claimSafety: { ...GEOLEDGER_CLAIM_SAFETY },
  };
}

/**
 * Climatiq emission estimate. This is for pre-screening and MRV support,
 * not a final certified offset calculation.
 */
const emissionsRequestSchema = z.object({
  activity_id: z.string().min(1),
  data_version: z.string().default("^21"),
  parameters: z.record(z.any()),
});

async function fetchClimatiqEstimateWithKey(
  parsed: z.infer<typeof emissionsRequestSchema>,
  apiKey: string
): Promise<any> {
  return fetchJson<any>(
    "https://api.climatiq.io/data/v1/estimate",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        emission_factor: {
          activity_id: parsed.activity_id,
          data_version: parsed.data_version,
        },
        parameters: parsed.parameters,
      }),
    },
    18_000
  );
}

export async function estimateEmissions(input: unknown) {
  const apiKey = process.env.CLIMATIQ_API_KEY;
  if (!apiKey) {
    return {
      configured: false,
      source: "Climatiq",
      status: "needs_key",
      message: "Set CLIMATIQ_API_KEY in Railway to enable kgCO2e activity estimates.",
    };
  }

  const parsed = emissionsRequestSchema.parse(input);
  const data = await fetchClimatiqEstimateWithKey(parsed, apiKey);

  return {
    configured: true,
    source: "Climatiq",
    status: "estimated",
    kgCO2e: data.co2e,
    co2eUnit: data.co2e_unit,
    factor: data.emission_factor,
    notices: data.notices ?? [],
    raw: data,
    dpalWarning: "Use for MRV pre-screening/support. Do not market as certified carbon offset issuance without approved methodology and validation.",
  };
}

const CARBON_ESTIMATE_PACKET_TYPE = "DPAL_CARBON_ESTIMATE_PACKET_V0_1";

const carbonEstimatePacketBodySchema = z.object({
  subject: z.string().min(1),
  activity_id: z.string().min(1),
  data_version: z.string().default("^21"),
  parameters: z.record(z.any()),
  location: z.object({
    label: z.string().optional(),
    lat: z.number(),
    lng: z.number(),
  }),
  projectId: z.string().optional(),
});

function noticesIncludeWarnings(notices: unknown): boolean {
  if (!Array.isArray(notices)) return false;
  for (const n of notices) {
    if (typeof n === "string") {
      if (n.toLowerCase().includes("warn")) return true;
      continue;
    }
    if (n && typeof n === "object") {
      const o = n as Record<string, unknown>;
      const t = String(o.type ?? o.severity ?? o.level ?? o.category ?? "").toLowerCase();
      if (t.includes("warn") || t.includes("caution")) return true;
    }
  }
  return false;
}

function mapClimatiqToPacketEstimate(data: any) {
  const ef = data?.emission_factor;
  return {
    kgCO2e: data?.co2e ?? null,
    co2eUnit: data?.co2e_unit ?? null,
    calculationMethod: data?.calculation_method ?? ef?.calculation_method ?? null,
    calculationOrigin: data?.calculation_origin ?? ef?.source ?? ef?.source_link ?? null,
    emissionFactor: data?.emission_factor ?? null,
    notices: data?.notices ?? [],
    raw: data,
  };
}

/**
 * DPAL Carbon Estimate Packet — Climatiq-backed MRV pre-screening envelope (advisory).
 */
export async function buildCarbonEstimatePacket(input: unknown) {
  const body = carbonEstimatePacketBodySchema.parse(input);

  if (!process.env.CLIMATIQ_API_KEY) {
    const payloadForHash = {
      type: CARBON_ESTIMATE_PACKET_TYPE,
      validationStatus: "needs_key" as const,
      status: "needs_key" as const,
      subject: body.subject,
      activity_id: body.activity_id,
      data_version: body.data_version,
      parameters: body.parameters,
      location: body.location,
      projectId: body.projectId ?? null,
    };
    return {
      status: "needs_key" as const,
      validationStatus: "needs_key" as const,
      message: "Set CLIMATIQ_API_KEY in Railway to enable carbon estimate packets.",
      confidenceScore: 0,
      evidenceHash: sha256(JSON.stringify(payloadForHash)),
      claimSafety: { validatorReviewed: false, publicClaimAllowed: false },
    };
  }

  const apiKey = process.env.CLIMATIQ_API_KEY;
  const parsedEmissions = emissionsRequestSchema.parse({
    activity_id: body.activity_id,
    data_version: body.data_version,
    parameters: body.parameters,
  });

  const data = await fetchClimatiqEstimateWithKey(parsedEmissions, apiKey);
  const estimate = mapClimatiqToPacketEstimate(data);
  const hasWarnings = noticesIncludeWarnings(estimate.notices);
  const confidenceScore = hasWarnings ? 0.45 : 0.6;

  const packetBase = {
    packetType: CARBON_ESTIMATE_PACKET_TYPE,
    subject: body.subject,
    ...(body.projectId != null && String(body.projectId).trim() !== ""
      ? { projectId: body.projectId }
      : {}),
    location: body.location,
    activityId: body.activity_id,
    dataVersion: body.data_version,
    parameters: body.parameters,
    estimate,
    validationStatus: "advisory" as const,
    confidenceScore,
    method:
      "DPAL Carbon Estimate v0.1 = activity data converted into kgCO2e using Climatiq emission factors for MRV pre-screening.",
    validatorStatus: "pending_review" as const,
    claimSafety: {
      validatorReviewed: false,
      publicClaimAllowed: false,
      warning:
        "Advisory pre-screening only. Not a certified carbon credit, offset, or verified VIU unless separately validated under an approved methodology.",
    },
  };

  const payloadForHash = {
    ...packetBase,
    estimate: {
      kgCO2e: estimate.kgCO2e,
      co2eUnit: estimate.co2eUnit,
      calculationMethod: estimate.calculationMethod,
      calculationOrigin: estimate.calculationOrigin,
      emissionFactor: estimate.emissionFactor,
      notices: estimate.notices,
    },
    generatedAtHour: new Date().toISOString().slice(0, 13),
  };

  return {
    ...packetBase,
    evidenceHash: sha256(JSON.stringify(payloadForHash)),
  };
}

const BLOCKCHAIN_ANCHOR_PREVIEW_PACKET_TYPE = "DPAL_BLOCKCHAIN_ANCHOR_PREVIEW_V0_1" as const;
const DEFAULT_ANCHOR_SOURCE_PACKET_TYPE = "UNKNOWN_DPAL_PACKET";
const DEFAULT_ANCHOR_SOURCE_MODULE = "unknown";
const DEFAULT_ANCHOR_VALIDATOR_STATUS = "pending_review";

export type BlockchainAnchorPreviewLocation = {
  label?: string;
  lat?: number;
  lng?: number;
};

export type BlockchainAnchorPreviewInput = {
  evidenceHash: string;
  packetType?: string;
  sourceModule?: string;
  location?: BlockchainAnchorPreviewLocation | null;
  projectId?: string;
  validatorStatus?: string;
};

function normalizeAnchorPreviewLocation(raw: unknown): BlockchainAnchorPreviewLocation | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const o = raw as Record<string, unknown>;
  const out: BlockchainAnchorPreviewLocation = {};
  if (typeof o.label === "string" && o.label.trim()) out.label = o.label.trim();
  const lat = typeof o.lat === "number" ? o.lat : Number(o.lat);
  const lng = typeof o.lng === "number" ? o.lng : Number(o.lng);
  if (Number.isFinite(lat)) out.lat = lat;
  if (Number.isFinite(lng)) out.lng = lng;
  if (out.label === undefined && out.lat === undefined && out.lng === undefined) return undefined;
  return out;
}

/**
 * Preview-only envelope: prepares a DPAL evidenceHash for future public-chain anchoring
 * without broadcasting a transaction or using private keys.
 *
 * anchorPayloadHash omits generatedAt so the same source fields yield the same digest on
 * repeat previews — safer than a time-varying hash that could be mistaken for a rotating
 * on-chain commitment while still in preview-only mode.
 */
export function buildBlockchainAnchorPreview(input: BlockchainAnchorPreviewInput) {
  const evidenceHash = String(input.evidenceHash ?? "").trim();
  const sourcePacketType =
    String(input.packetType ?? "").trim() || DEFAULT_ANCHOR_SOURCE_PACKET_TYPE;
  const sourceModule = String(input.sourceModule ?? "").trim() || DEFAULT_ANCHOR_SOURCE_MODULE;
  const validatorStatus =
    String(input.validatorStatus ?? "").trim() || DEFAULT_ANCHOR_VALIDATOR_STATUS;
  const projectIdRaw = input.projectId != null ? String(input.projectId).trim() : "";
  const projectId = projectIdRaw !== "" ? projectIdRaw : undefined;
  const location = normalizeAnchorPreviewLocation(input.location);

  const anchorStatus = "preview_only" as const;
  const chainTarget = "not_selected" as const;
  const generatedAt = new Date().toISOString();

  const hashPayload: Record<string, unknown> = {
    schema: "DPAL_BLOCKCHAIN_ANCHOR_PREVIEW_HASH_V0_1",
    evidenceHash,
    sourcePacketType,
    sourceModule,
    validatorStatus,
    anchorStatus,
    chainTarget,
  };
  if (location) hashPayload.location = location;
  if (projectId !== undefined) hashPayload.projectId = projectId;

  const anchorPayloadHash = sha256(JSON.stringify(hashPayload));

  return {
    packetType: BLOCKCHAIN_ANCHOR_PREVIEW_PACKET_TYPE,
    evidenceHash,
    sourcePacketType,
    sourceModule,
    ...(location ? { location } : {}),
    ...(projectId !== undefined ? { projectId } : {}),
    validatorStatus,
    anchorStatus,
    chainTarget,
    generatedAt,
    anchorPayloadHash,
    method:
      "DPAL Blockchain Anchor Preview v0.1 = evidence hash prepared for public-chain anchoring without broadcasting a transaction.",
    claimSafety: {
      validatorReviewed: false,
      publicClaimAllowed: false,
      warning: "Anchor preview only. No blockchain transaction has been broadcast.",
    },
  };
}

const USGS_WATER_SNAPSHOT_PACKET_TYPE = "DPAL_USGS_WATER_SITE_SNAPSHOT_V0_1" as const;
const USGS_IV_BASE = "https://waterservices.usgs.gov/nwis/iv/";
const DEFAULT_USGS_PARAMETERS = "00060,00065,00010";
const USGS_WATER_SNAPSHOT_METHOD =
  "DPAL USGS Water Snapshot v0.1 = USGS stream gauge readings normalized into a water intelligence packet.";

const USGS_WATER_CLAIM_SAFETY = {
  validatorReviewed: false,
  publicClaimAllowed: false,
  warning:
    "USGS water data packet is advisory until reviewed. Do not treat as official flood determination by DPAL.",
} as const;

export type UsgsWaterSiteSnapshotInput = {
  site?: string;
  lat?: number;
  lng?: number;
  parameters?: string;
};

export type WaterAlertEvidencePacketInput = {
  lat: number;
  lng: number;
  label?: string;
  usgsSite?: string;
};

/** Decode common WaterML / USGS HTML entities for human-readable labels (parameterName, unit). */
function decodeBasicHtmlEntities(s: string): string {
  let out = String(s || "");

  out = out.replace(/&#(\d{1,7});/g, (match, numStr: string) => {
    const code = Number(numStr);
    if (!Number.isFinite(code) || code < 0 || code > 0x10ffff) return match;
    try {
      return String.fromCodePoint(code);
    } catch {
      return match;
    }
  });

  out = out.replace(/&#x([0-9a-f]{1,6});/gi, (match, hex: string) => {
    const code = parseInt(hex, 16);
    if (!Number.isFinite(code) || code < 0 || code > 0x10ffff) return match;
    try {
      return String.fromCodePoint(code);
    } catch {
      return match;
    }
  });

  out = out.replace(/\u200e/g, "");

  out = out
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&deg;/gi, "°")
    .replace(/&sup3;/gi, "³")
    .replace(/&sup2;/gi, "²")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");

  return out;
}

function parseIvTimeSeriesRoot(data: unknown): unknown[] {
  const root = data as { value?: { timeSeries?: unknown } };
  const ts = root?.value?.timeSeries;
  return Array.isArray(ts) ? ts : [];
}

function extractSiteCandidatesFromIv(timeSeries: unknown[]): Array<{
  site: string;
  lat: number;
  lng: number;
  siteName: string;
}> {
  const bySite = new Map<string, { site: string; lat: number; lng: number; siteName: string }>();
  for (const row of timeSeries) {
    const r = row as {
      sourceInfo?: {
        siteName?: string;
        siteCode?: Array<{ value?: string }>;
        geoLocation?: { geogLocation?: { latitude?: number; longitude?: number } };
      };
    };
    const rawCode = r?.sourceInfo?.siteCode?.[0]?.value;
    if (rawCode == null || String(rawCode).trim() === "") continue;
    const site = String(rawCode).trim();
    const geo = r?.sourceInfo?.geoLocation?.geogLocation;
    const lat = Number(geo?.latitude);
    const lng = Number(geo?.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    const siteName = String(r?.sourceInfo?.siteName || "").trim() || site;
    if (!bySite.has(site)) bySite.set(site, { site, lat, lng, siteName });
  }
  return [...bySite.values()];
}

function pickNearestSiteCandidate(
  candidates: Array<{ site: string; lat: number; lng: number; siteName: string }>,
  lat: number,
  lng: number
): { site: string; lat: number; lng: number; siteName: string } | null {
  if (candidates.length === 0) return null;
  let best = candidates[0]!;
  let bestD = Infinity;
  for (const c of candidates) {
    const dx = c.lng - lng;
    const dy = c.lat - lat;
    const d2 = dx * dx + dy * dy;
    if (d2 < bestD) {
      bestD = d2;
      best = c;
    }
  }
  return best;
}

type UsgsNormalizedReading = {
  parameterCode: string;
  parameterName: string;
  value: number | null;
  unit: string;
  dateTime: string;
  qualifiers: string[];
};

function collectLatestReadingsPerParameter(timeSeries: unknown[]): UsgsNormalizedReading[] {
  type Agg = UsgsNormalizedReading & { t: number };
  const latest = new Map<string, Agg>();

  for (const series of timeSeries) {
    const s = series as {
      variable?: {
        variableCode?: Array<{ value?: string }>;
        variableName?: string;
        unit?: { unitCode?: string };
      };
      values?: Array<{ value?: Array<{ value?: string | number; qualifiers?: unknown; dateTime?: string }> }>;
    };
    const paramCodes = s?.variable?.variableCode;
    const firstCode =
      Array.isArray(paramCodes) && paramCodes[0]?.value != null ? String(paramCodes[0].value).trim() : "";
    if (!firstCode) continue;

    const parameterName = decodeBasicHtmlEntities(String(s?.variable?.variableName || firstCode));
    const unit =
      decodeBasicHtmlEntities(String(s?.variable?.unit?.unitCode || "").trim()) || "unknown";

    const valueBlocks = Array.isArray(s?.values) ? s.values : [];
    for (const block of valueBlocks) {
      const points = Array.isArray(block?.value) ? block.value : [];
      for (const pt of points) {
        const dtStr = pt?.dateTime != null ? String(pt.dateTime) : "";
        const t = Date.parse(dtStr);
        if (!Number.isFinite(t) || dtStr === "") continue;

        const rawVal = pt?.value;
        let num: number | null = null;
        if (rawVal != null && rawVal !== "") {
          const n = Number(rawVal);
          num = Number.isFinite(n) ? n : null;
        }

        const qualifiers = Array.isArray(pt?.qualifiers)
          ? pt.qualifiers.map((q: unknown) => String(q))
          : [];

        const prev = latest.get(firstCode);
        if (!prev || t > prev.t) {
          latest.set(firstCode, {
            parameterCode: firstCode,
            parameterName,
            unit,
            value: num,
            dateTime: dtStr,
            qualifiers,
            t,
          });
        }
      }
    }
  }

  const rows: UsgsNormalizedReading[] = [...latest.values()].map(({ t: _t, ...rest }) => rest);
  rows.sort((a, b) => a.parameterCode.localeCompare(b.parameterCode));
  return rows;
}

function buildUsgsWaterSignals(readings: UsgsNormalizedReading[]) {
  const byCode = new Map(readings.map((r) => [r.parameterCode, r.value]));
  return {
    dischargeCfs: byCode.get("00060") ?? null,
    gageHeightFt: byCode.get("00065") ?? null,
    waterTempC: byCode.get("00010") ?? null,
  };
}

/**
 * USGS NWIS instantaneous values → DPAL water intelligence packet (advisory).
 * Site discovery uses a small IV bBox query (stream sites with discharge); USGS Site Service JSON is not used.
 */
export async function getUsgsWaterSiteSnapshot(input: UsgsWaterSiteSnapshotInput) {
  const generatedAt = new Date().toISOString();
  const parameterCd =
    input.parameters != null && String(input.parameters).trim() !== ""
      ? String(input.parameters).trim()
      : DEFAULT_USGS_PARAMETERS;

  let site: string | null = null;
  let coordinates: Coordinates | null = null;
  let siteName: string | null = null;

  const hashEvidence = (payload: Record<string, unknown>) =>
    sha256(
      JSON.stringify({
        type: USGS_WATER_SNAPSHOT_PACKET_TYPE,
        generatedAt,
        ...payload,
      })
    );

  const siteTrimmed = input.site != null ? String(input.site).trim() : "";

  try {
    if (siteTrimmed) {
      site = siteTrimmed;
    } else {
      const lat = Number(input.lat);
      const lng = Number(input.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        return {
          packetType: USGS_WATER_SNAPSHOT_PACKET_TYPE,
          source: "USGS Water Services",
          site: null,
          coordinates: null,
          siteName: null,
          generatedAt,
          readings: [] as UsgsNormalizedReading[],
          waterSignals: { dischargeCfs: null, gageHeightFt: null, waterTempC: null },
          status: "error" as const,
          message: "Provide either site or lat/lng.",
          method: USGS_WATER_SNAPSHOT_METHOD,
          evidenceHash: hashEvidence({ status: "error", reason: "missing_input" }),
          claimSafety: { ...USGS_WATER_CLAIM_SAFETY },
        };
      }

      const delta = 0.03;
      const bBox = `${lng - delta},${lat - delta},${lng + delta},${lat + delta}`;
      const discoveryParams = new URLSearchParams({
        format: "json",
        bBox,
        parameterCd: "00060",
        siteType: "ST",
        siteStatus: "active",
      });
      const discoveryData = await fetchJson<unknown>(`${USGS_IV_BASE}?${discoveryParams.toString()}`);
      const candidates = extractSiteCandidatesFromIv(parseIvTimeSeriesRoot(discoveryData));
      const picked = pickNearestSiteCandidate(candidates, lat, lng);
      if (!picked) {
        return {
          packetType: USGS_WATER_SNAPSHOT_PACKET_TYPE,
          source: "USGS Water Services",
          site: null,
          coordinates: { lat, lng },
          siteName: null,
          generatedAt,
          readings: [] as UsgsNormalizedReading[],
          waterSignals: { dischargeCfs: null, gageHeightFt: null, waterTempC: null },
          status: "no_data" as const,
          method: USGS_WATER_SNAPSHOT_METHOD,
          evidenceHash: hashEvidence({
            status: "no_data",
            coordinates: { lat, lng },
            reason: "no_stream_site_in_bbox",
          }),
          claimSafety: { ...USGS_WATER_CLAIM_SAFETY },
        };
      }
      site = picked.site;
      coordinates = { lat: picked.lat, lng: picked.lng };
      siteName = picked.siteName;
    }

    const ivParams = new URLSearchParams({
      format: "json",
      sites: site,
      parameterCd,
      siteStatus: "all",
    });
    const ivData = await fetchJson<unknown>(`${USGS_IV_BASE}?${ivParams.toString()}`);
    const series = parseIvTimeSeriesRoot(ivData);

    if (series.length > 0) {
      const first = series[0] as {
        sourceInfo?: {
          siteName?: string;
          geoLocation?: { geogLocation?: { latitude?: number; longitude?: number } };
        };
      };
      const geo = first?.sourceInfo?.geoLocation?.geogLocation;
      const lat = Number(geo?.latitude);
      const lng = Number(geo?.longitude);
      if (Number.isFinite(lat) && Number.isFinite(lng)) coordinates = { lat, lng };
      const nm = String(first?.sourceInfo?.siteName || "").trim();
      if (nm) siteName = nm;
    }

    if (series.length === 0) {
      return {
        packetType: USGS_WATER_SNAPSHOT_PACKET_TYPE,
        source: "USGS Water Services",
        site,
        coordinates,
        siteName,
        generatedAt,
        readings: [] as UsgsNormalizedReading[],
        waterSignals: { dischargeCfs: null, gageHeightFt: null, waterTempC: null },
        status: "no_data" as const,
        method: USGS_WATER_SNAPSHOT_METHOD,
        evidenceHash: hashEvidence({
          status: "no_data",
          site,
          coordinates,
          parameterCd,
        }),
        claimSafety: { ...USGS_WATER_CLAIM_SAFETY },
      };
    }

    const readings = collectLatestReadingsPerParameter(series);
    if (readings.length === 0) {
      return {
        packetType: USGS_WATER_SNAPSHOT_PACKET_TYPE,
        source: "USGS Water Services",
        site,
        coordinates,
        siteName,
        generatedAt,
        readings: [] as UsgsNormalizedReading[],
        waterSignals: { dischargeCfs: null, gageHeightFt: null, waterTempC: null },
        status: "no_data" as const,
        method: USGS_WATER_SNAPSHOT_METHOD,
        evidenceHash: hashEvidence({
          status: "no_data",
          site,
          coordinates,
          parameterCd,
        }),
        claimSafety: { ...USGS_WATER_CLAIM_SAFETY },
      };
    }

    const waterSignals = buildUsgsWaterSignals(readings);

    return {
      packetType: USGS_WATER_SNAPSHOT_PACKET_TYPE,
      source: "USGS Water Services",
      site,
      coordinates,
      siteName,
      generatedAt,
      readings,
      waterSignals,
      status: "ok" as const,
      method: USGS_WATER_SNAPSHOT_METHOD,
      evidenceHash: hashEvidence({
        status: "ok",
        site,
        coordinates,
        readings: readings.map((r) => ({
          parameterCode: r.parameterCode,
          value: r.value,
          unit: r.unit,
          dateTime: r.dateTime,
        })),
        waterSignals,
      }),
      claimSafety: { ...USGS_WATER_CLAIM_SAFETY },
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "USGS request failed.";
    return {
      packetType: USGS_WATER_SNAPSHOT_PACKET_TYPE,
      source: "USGS Water Services",
      site,
      coordinates,
      siteName,
      generatedAt,
      readings: [] as UsgsNormalizedReading[],
      waterSignals: { dischargeCfs: null, gageHeightFt: null, waterTempC: null },
      status: "error" as const,
      message: msg,
      method: USGS_WATER_SNAPSHOT_METHOD,
      evidenceHash: hashEvidence({
        status: "error",
        site,
        coordinates,
        error: msg,
      }),
      claimSafety: { ...USGS_WATER_CLAIM_SAFETY },
    };
  }
}

function isNwsTestAlert(alert: Record<string, unknown>): boolean {
  const status = String(alert.status ?? "").trim().toLowerCase();
  const event = String(alert.event ?? "").trim().toLowerCase();
  const headline = String(alert.headline ?? "").trim().toLowerCase();
  const messageType = String(alert.messageType ?? "").trim().toLowerCase();
  if (status === "test") return true;
  if (messageType === "test") return true;
  return (
    event.includes("test message") ||
    event.includes("test") ||
    headline.includes("test message")
  );
}

/**
 * DPAL Water Alert Evidence Packet:
 * combines FloodGuard, USGS site snapshot, NWS active alerts, and GeoLedger reverse identity.
 */
export async function buildWaterAlertEvidencePacket(input: WaterAlertEvidencePacketInput) {
  const lat = Number(input.lat);
  const lng = Number(input.lng);
  const label =
    typeof input.label === "string" && input.label.trim() ? input.label.trim() : undefined;
  const usgsSite =
    typeof input.usgsSite === "string" && input.usgsSite.trim() ? input.usgsSite.trim() : undefined;
  const generatedAt = new Date().toISOString();

  const latR = roundCoord3(lat);
  const lngR = roundCoord3(lng);
  const coords = { lat, lng };

  /**
   * Global Provider Routing — decide which providers apply to this coordinate BEFORE
   * making any external HTTP calls. Skipping a non-applicable provider is intentional
   * and is recorded in the monitor so /api/debug/provider-usage reflects reality.
   */
  const usgsApplicability = getProviderApplicability("USGS", coords, { usgsSite });
  const nwsApplicability = getProviderApplicability("NWS", coords);
  const geoApplicability = getProviderApplicability("GeoLedger", coords);

  const floodguard = await getFloodGuardForWaterPacket({ lat, lng });

  // ── USGS Water Services (U.S. + territories only, unless explicit usgsSite is given)
  const usgsKey = buildProviderRequestKey("USGS", "water_packet_snapshot", {
    latRounded3: latR,
    lngRounded3: lngR,
    site: usgsSite ?? "",
  });
  let usgsWater: any;
  if (!usgsApplicability.applicable) {
    recordProviderSkip({
      providerName: "USGS",
      operation: "water_packet_snapshot",
      requestKey: usgsKey,
      status: "skipped_not_applicable",
      reason: usgsApplicability.reason,
      source: "water_alert_evidence_packet",
      latRounded3: latR,
      lngRounded3: lngR,
    });
    usgsWater = {
      source: "USGS Water Services",
      status: "not_applicable" as const,
      reason: usgsApplicability.reason,
      message: usgsApplicability.message,
      readings: [],
      waterSignals: { dischargeCfs: null, gageHeightFt: null, waterTempC: null },
    };
  } else {
    const usgsInput = usgsSite ? { site: usgsSite, lat, lng } : { lat, lng };
    usgsWater = await runGuardedProviderCall<any>({
      key: usgsKey,
      providerName: "USGS",
      operation: "water_packet_snapshot",
      latRounded3: latR,
      lngRounded3: lngR,
      source: "water_alert_evidence_packet",
      rateLimitCooldownMs: DEFAULT_COOLDOWN_MS.USGS_rate,
      errorCooldownMs: DEFAULT_COOLDOWN_MS.USGS_error,
      onCooldown: async () => ({
        source: "USGS Water Services",
        status: "error" as const,
        message: "USGS request skipped (server provider cooldown). Retry later.",
        readings: [],
        waterSignals: { dischargeCfs: null, gageHeightFt: null, waterTempC: null },
      }),
      fn: () => getUsgsWaterSiteSnapshot(usgsInput),
    }).catch((err: unknown) => ({
      source: "USGS Water Services",
      status: "error" as const,
      message: sanitizeProviderError(err),
      readings: [],
      waterSignals: { dischargeCfs: null, gageHeightFt: null, waterTempC: null },
    }));
  }

  // ── NOAA / NWS Active Alerts (U.S. + territories only)
  const nwsKey = buildProviderRequestKey("NWS", "water_packet_alerts", {
    latRounded3: latR,
    lngRounded3: lngR,
    labelKey: (label ?? "").slice(0, 120),
  });
  let nwsAlerts: any;
  if (!nwsApplicability.applicable) {
    recordProviderSkip({
      providerName: "NWS",
      operation: "water_packet_alerts",
      requestKey: nwsKey,
      status: "skipped_not_applicable",
      reason: nwsApplicability.reason,
      source: "water_alert_evidence_packet",
      latRounded3: latR,
      lngRounded3: lngR,
    });
    nwsAlerts = {
      source: "NOAA/National Weather Service",
      status: "not_applicable" as const,
      reason: nwsApplicability.reason,
      message: nwsApplicability.message,
      alertCount: 0,
      highestSeverity: null,
      activeAlerts: [],
    };
  } else {
    nwsAlerts = await runGuardedProviderCall<any>({
      key: nwsKey,
      providerName: "NWS",
      operation: "water_packet_alerts",
      latRounded3: latR,
      lngRounded3: lngR,
      source: "water_alert_evidence_packet",
      rateLimitCooldownMs: DEFAULT_COOLDOWN_MS.NWS_rate,
      errorCooldownMs: DEFAULT_COOLDOWN_MS.NWS_error,
      onCooldown: async () => ({
        source: "NOAA/National Weather Service",
        status: "error" as const,
        message: "NWS request skipped (server provider cooldown). Retry later.",
        alertCount: 0,
        highestSeverity: null,
        activeAlerts: [],
      }),
      fn: () => getNwsActiveAlertsPacket({ lat, lng, label }),
    }).catch((err: unknown) => ({
      source: "NOAA/National Weather Service",
      status: "error" as const,
      message: sanitizeProviderError(err),
      alertCount: 0,
      highestSeverity: null,
      activeAlerts: [],
    }));
  }

  // ── GeoLedger / Geoapify (requires GEOAPIFY_API_KEY)
  const geoKey = buildProviderRequestKey("GeoLedger", "water_packet_reverse", {
    latRounded3: latR,
    lngRounded3: lngR,
    labelKey: (label ?? "").slice(0, 120),
  });
  let geoLedger: any;
  if (!geoApplicability.applicable) {
    recordProviderSkip({
      providerName: "GeoLedger",
      operation: "water_packet_reverse",
      requestKey: geoKey,
      status: "skipped_missing_key",
      reason: geoApplicability.reason,
      source: "water_alert_evidence_packet",
      latRounded3: latR,
      lngRounded3: lngR,
    });
    geoLedger = {
      source: "GeoLedger",
      status: "not_configured" as const,
      validationStatus: "not_configured" as const,
      reason: geoApplicability.reason,
      message: geoApplicability.message,
      geoLedgerId: null,
      formattedAddress: null,
      confidenceScore: 0,
    };
  } else {
    geoLedger = await runGuardedProviderCall<any>({
      key: geoKey,
      providerName: "GeoLedger",
      operation: "water_packet_reverse",
      latRounded3: latR,
      lngRounded3: lngR,
      source: "water_alert_evidence_packet",
      rateLimitCooldownMs: DEFAULT_COOLDOWN_MS.GeoLedger_rate,
      errorCooldownMs: DEFAULT_COOLDOWN_MS.GeoLedger_error,
      onCooldown: async () => ({
        source: "GeoLedger",
        status: "error" as const,
        validationStatus: "error" as const,
        message: "GeoLedger request skipped (server provider cooldown). Retry later.",
        geoLedgerId: null,
        formattedAddress: null,
      }),
      fn: () => getGeoLedgerReverseLocation({ lat, lng, label: label ?? "" }),
    }).catch((err: unknown) => ({
      source: "GeoLedger",
      status: "error" as const,
      validationStatus: "error" as const,
      message: sanitizeProviderError(err),
      geoLedgerId: null,
      formattedAddress: null,
    }));
  }

  /**
   * moduleHealth values:
   *   "ok"               — provider returned a healthy result for this packet
   *   "cached"           — provider returned a cache hit
   *   "stale_fallback"   — provider returned a stale-cache fallback (provider in cooldown)
   *   "unavailable"      — provider was reachable but returned no usable data
   *   "error"            — provider call failed (network / 5xx / etc.)
   *   "not_applicable"   — provider does not apply to this coordinate (e.g. USGS outside U.S.)
   *   "not_configured"   — provider requires an API key that is not set on this server
   */
  const floodguardHealth: "ok" | "cached" | "stale_fallback" | "unavailable" | "error" =
    (floodguard as any)?.status === "unavailable"
      ? "unavailable"
      : (floodguard as any)?.cacheStatus === "stale_fallback"
        ? "stale_fallback"
        : (floodguard as any)?.cacheStatus === "hit"
          ? "cached"
          : (floodguard as any)?.cacheStatus === "fresh"
            ? "ok"
            : "error";

  const usgsHealth: "ok" | "error" | "unavailable" | "not_applicable" =
    (usgsWater as any)?.status === "not_applicable"
      ? "not_applicable"
      : (usgsWater as any)?.status === "ok"
        ? "ok"
        : (usgsWater as any)?.status === "error"
          ? "error"
          : "unavailable";

  const nwsHealth: "ok" | "error" | "unavailable" | "not_applicable" =
    (nwsAlerts as any)?.status === "not_applicable"
      ? "not_applicable"
      : (nwsAlerts as any)?.status === "ok" || (nwsAlerts as any)?.status === "no_active_alerts"
        ? "ok"
        : (nwsAlerts as any)?.status === "error"
          ? "error"
          : "unavailable";

  const geoLedgerHealth: "ok" | "error" | "unavailable" | "not_configured" =
    (geoLedger as any)?.status === "not_configured" ||
    (geoLedger as any)?.validationStatus === "not_configured" ||
    (geoLedger as any)?.status === "needs_key" ||
    (geoLedger as any)?.validationStatus === "needs_key"
      ? "not_configured"
      : (geoLedger as any)?.status === "matched" ||
          (geoLedger as any)?.validationStatus === "advisory"
        ? "ok"
        : (geoLedger as any)?.status === "error" ||
            (geoLedger as any)?.validationStatus === "error"
          ? "error"
          : "unavailable";

  const moduleHealth = {
    floodguard: floodguardHealth,
    usgsWater: usgsHealth,
    nwsAlerts: nwsHealth,
    geoLedger: geoLedgerHealth,
  };

  /**
   * Packet status policy:
   *   - "ok"        when every *applicable* provider succeeded (and any other providers were
   *                 skipped only because they are not_applicable / not_configured).
   *   - "degraded"  when at least one applicable provider failed (or returned unavailable),
   *                 but DPAL still produced a useful packet from the remaining providers.
   *   - "error"     when NO provider produced a useful result for this packet.
   *
   * Importantly: a packet is NOT marked "error" merely because U.S.-specific providers were
   * not applicable for an international coordinate, and NOT marked "error" merely because
   * GeoLedger requires a key that isn't configured.
   */
  const moduleValues = Object.values(moduleHealth);
  const applicableValues = moduleValues.filter(
    (v) => v !== "not_applicable" && v !== "not_configured",
  );
  const applicableHealthyCount = applicableValues.filter(
    (v) => v === "ok" || v === "cached" || v === "stale_fallback",
  ).length;
  const applicableFailureCount = applicableValues.length - applicableHealthyCount;

  let packetStatus: "ok" | "degraded" | "error";
  if (applicableValues.length === 0) {
    packetStatus = "error";
  } else if (applicableFailureCount === 0) {
    packetStatus = "ok";
  } else {
    packetStatus = applicableHealthyCount > 0 ? "degraded" : "degraded";
  }

  /**
   * providerRouting describes WHY each provider ran or did not run for this coordinate.
   * Frontends can use this to render an accurate "U.S. providers skipped (not applicable)"
   * badge instead of a misleading "USGS failed" red dot.
   */
  const providerRouting = {
    usedGlobal: [
      "FloodGuard",
      ...(usgsApplicability.applicable ? ["USGS"] : []),
      ...(nwsApplicability.applicable ? ["NWS"] : []),
      ...(geoApplicability.applicable ? ["GeoLedger"] : []),
    ].filter((p, i, arr) => arr.indexOf(p) === i),
    skippedRegional: [
      ...(usgsApplicability.applicable
        ? []
        : [{ provider: "USGS", reason: usgsApplicability.reason, message: usgsApplicability.message }]),
      ...(nwsApplicability.applicable
        ? []
        : [{ provider: "NWS", reason: nwsApplicability.reason, message: nwsApplicability.message }]),
    ],
    skippedNotConfigured: geoApplicability.applicable
      ? []
      : [
          {
            provider: "GeoLedger",
            reason: geoApplicability.reason,
            message: geoApplicability.message,
          },
        ],
  };

  const isInternationalCoord = !usgsApplicability.applicable && !nwsApplicability.applicable;
  const providerRoutingNotes: string[] = [];
  if (isInternationalCoord) {
    providerRoutingNotes.push(
      "DPAL used global water/flood providers for this location. U.S.-specific providers were marked not applicable and were not called.",
    );
  } else if (!usgsApplicability.applicable && usgsApplicability.message) {
    providerRoutingNotes.push(usgsApplicability.message);
  } else if (!nwsApplicability.applicable && nwsApplicability.message) {
    providerRoutingNotes.push(nwsApplicability.message);
  }
  if (!geoApplicability.applicable && geoApplicability.message) {
    providerRoutingNotes.push(geoApplicability.message);
  }

  const activeAlerts = Array.isArray((nwsAlerts as any)?.activeAlerts)
    ? ((nwsAlerts as any).activeAlerts as Array<Record<string, unknown>>)
    : [];
  const officialAlerts = activeAlerts.filter((a) => !isNwsTestAlert(a));
  const highestOfficialSeverity = computeHighestNwsSeverity(
    officialAlerts.map((a) => ({ severity: a.severity as string | null | undefined }))
  );
  const hasOfficialAlert = officialAlerts.length > 0;
  const floodRiskLevel = String((floodguard as any)?.floodRisk?.level ?? "unknown").toLowerCase();
  const floodRiskScoreRaw = Number((floodguard as any)?.floodRisk?.score);
  const floodRiskScore =
    floodRiskLevel === "unavailable"
      ? null
      : Number.isFinite(floodRiskScoreRaw)
        ? floodRiskScoreRaw
        : null;
  const usgsStatus = String((usgsWater as any)?.status ?? "unknown");
  const nwsStatus = String((nwsAlerts as any)?.status ?? "unknown");

  const isUrgentByFlood = floodRiskLevel === "high" || floodRiskLevel === "critical";
  const isUrgentByNws =
    hasOfficialAlert &&
    (highestOfficialSeverity === "Severe" || highestOfficialSeverity === "Extreme");

  let recommendedReviewStatus =
    isUrgentByFlood || isUrgentByNws
      ? ("urgent_review" as const)
      : floodRiskLevel === "moderate" || usgsStatus === "ok" || hasOfficialAlert
        ? ("review" as const)
        : ("monitor" as const);
  if (packetStatus === "degraded" && recommendedReviewStatus === "monitor") {
    recommendedReviewStatus = "review";
  }

  const canonicalSummary = {
    packetType: "DPAL_WATER_ALERT_EVIDENCE_PACKET_V0_1",
    coordinates: { lat, lng },
    ...(label ? { label } : {}),
    sourceModules: [
      "FloodGuard",
      "USGS Water Services",
      "NOAA/National Weather Service",
      "GeoLedger",
    ],
    floodguard: {
      source: (floodguard as any)?.source ?? null,
      floodRisk: (floodguard as any)?.floodRisk ?? null,
      forecastSummary: (floodguard as any)?.forecastSummary ?? null,
      radarFrameTime: (floodguard as any)?.radar?.latestFrame?.time ?? null,
      radarFramePath: (floodguard as any)?.radar?.latestFrame?.path ?? null,
      evidenceHash: (floodguard as any)?.evidenceHash ?? null,
    },
    usgsWater: {
      site: (usgsWater as any)?.site ?? null,
      status: (usgsWater as any)?.status ?? null,
      siteName: (usgsWater as any)?.siteName ?? null,
      waterSignals: (usgsWater as any)?.waterSignals ?? null,
      readings: (usgsWater as any)?.readings ?? [],
      evidenceHash: (usgsWater as any)?.evidenceHash ?? null,
    },
    nwsAlerts: {
      status: (nwsAlerts as any)?.status ?? null,
      alertCount: (nwsAlerts as any)?.alertCount ?? 0,
      highestSeverity: (nwsAlerts as any)?.highestSeverity ?? null,
      activeAlerts: activeAlerts,
      officialAlerts,
      evidenceHash: (nwsAlerts as any)?.evidenceHash ?? null,
    },
    geoLedger: {
      status: (geoLedger as any)?.status ?? null,
      validationStatus: (geoLedger as any)?.validationStatus ?? null,
      geoLedgerId: (geoLedger as any)?.geoLedgerId ?? null,
      formattedAddress: (geoLedger as any)?.formattedAddress ?? null,
      confidenceScore: (geoLedger as any)?.confidenceScore ?? null,
      evidenceHash: (geoLedger as any)?.evidenceHash ?? null,
    },
    summary: {
      floodRiskLevel: floodRiskLevel === "unavailable" ? "unavailable" : floodRiskLevel,
      floodRiskScore,
      usgsStatus,
      nwsStatus,
      nwsAlertCount: officialAlerts.length,
      highestNwsSeverity: highestOfficialSeverity,
      hasOfficialAlert,
      recommendedReviewStatus,
      providerRoutingNotes,
    },
    status: packetStatus,
    moduleHealth,
    providerRouting,
  };

  const evidenceHash = sha256(JSON.stringify(canonicalSummary));

  const anchorPreviewRaw = buildBlockchainAnchorPreview({
    evidenceHash,
    packetType: "DPAL_WATER_ALERT_EVIDENCE_PACKET_V0_1",
    sourceModule: "Water Alert Evidence Packet",
    location: { lat, lng, ...(label ? { label } : {}) },
    validatorStatus: "pending_review",
  });

  return {
    packetType: "DPAL_WATER_ALERT_EVIDENCE_PACKET_V0_1" as const,
    sourceModules: [
      "FloodGuard",
      "USGS Water Services",
      "NOAA/National Weather Service",
      "GeoLedger",
    ],
    coordinates: { lat, lng },
    ...(label ? { label } : {}),
    generatedAt,
    status: packetStatus,
    moduleHealth,
    providerRouting,
    floodguard,
    usgsWater,
    nwsAlerts,
    geoLedger,
    summary: canonicalSummary.summary,
    evidenceHash,
    anchorPreview: {
      anchorStatus: "preview_only" as const,
      chainTarget: "not_selected" as const,
      anchorPayloadHash: anchorPreviewRaw.anchorPayloadHash,
    },
    method:
      "DPAL Water Alert Evidence Packet v0.1 = forecast/radar risk, USGS gauge readings, NWS alerts, and GeoLedger location identity combined into one advisory evidence packet.",
    claimSafety: {
      validatorReviewed: false,
      publicClaimAllowed: false,
      warning:
        "Advisory evidence packet only. DPAL does not replace USGS, NOAA/NWS, or local emergency authorities.",
    },
  };
}

/**
 * Etherscan V2 transaction status lookup.
 */
export async function verifyChainHash({ chainid, txhash }: { chainid: string; txhash: string }) {
  const apiKey = process.env.ETHERSCAN_API_KEY;
  if (!apiKey) {
    return {
      configured: false,
      source: "Etherscan V2",
      status: "needs_key",
      message: "Set ETHERSCAN_API_KEY in Railway to enable external blockchain verification.",
    };
  }

  const params = new URLSearchParams({
    chainid,
    module: "transaction",
    action: "gettxreceiptstatus",
    txhash,
    apikey: apiKey,
  });

  const data = await fetchJson<any>(`https://api.etherscan.io/v2/api?${params.toString()}`);
  return {
    configured: true,
    source: "Etherscan V2",
    chainid,
    txhash,
    status: data.status === "1" ? "found" : "not_confirmed_or_not_found",
    receiptStatus: data.result?.status,
    rawStatus: data.status,
    message: data.message,
  };
}

export async function getCityIntelligence({ lat, lng, city }: Coordinates & { city: string }) {
  const [flood, air] = await Promise.all([
    getFloodRisk({ lat, lng }),
    getAirQuality({ lat, lng }).catch((err) => ({ source: "OpenAQ", status: "error", error: err?.message })),
  ]);

  const evidenceHash = sha256(JSON.stringify({
    type: "DPAL_CITY_INTELLIGENCE_PACKET_V1",
    city,
    lat,
    lng,
    generatedAtHour: new Date().toISOString().slice(0, 13),
    floodRisk: flood.floodRisk,
    airRisk: (air as any)?.risk,
  }));

  return {
    packetType: "DPAL_CITY_INTELLIGENCE_PACKET_V1",
    city,
    coordinates: { lat, lng },
    generatedAt: new Date().toISOString(),
    evidenceHash,
    modules: {
      floodguard: flood,
      airQuality: air,
    },
    nextActions: [
      "Display advisory city-risk card in DPAL app.",
      "Allow validator to open a Situation Room when risk is high or critical.",
      "Attach drone, citizen, satellite, and field evidence to the same packet hash.",
      "Do not claim official emergency status unless verified by the responsible authority.",
    ],
  };
}

/**
 * Normalized DPAL evidence packet envelope.
 */
export function buildEvidencePacketPreview(input: any) {
  const now = new Date().toISOString();
  const packet = {
    packetType: "DPAL_EVIDENCE_PACKET_V1",
    generatedAt: now,
    subject: String(input?.subject || "DPAL Evidence Packet"),
    location: input?.location ?? null,
    sourceModules: Array.isArray(input?.sourceModules) ? input.sourceModules : [],
    observations: Array.isArray(input?.observations) ? input.observations : [],
    media: Array.isArray(input?.media) ? input.media : [],
    providerReadings: input?.providerReadings ?? {},
    validatorStatus: "pending_review",
    claimSafety: {
      publicClaimAllowed: false,
      reason: "Packet preview only. Requires human review and optional ledger anchoring before public verified claims.",
    },
  };

  return {
    ...packet,
    evidenceHash: sha256(JSON.stringify(packet)),
    qrPayload: {
      type: "DPAL_PACKET_VERIFY",
      evidenceHash: sha256(JSON.stringify(packet)),
      generatedAt: now,
    },
  };
}
