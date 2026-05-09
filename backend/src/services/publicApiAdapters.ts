import crypto from "crypto";
import { z } from "zod";

type Coordinates = { lat: number; lng: number };

type ProviderStatus = {
  key: string;
  label: string;
  configured: boolean;
  purpose: string;
  mode: "live" | "needs_key" | "optional" | "disabled";
};

const DEBUG = process.env.DPAL_API_DEBUG === "true";

function dlog(...args: unknown[]) {
  if (DEBUG) console.warn("[DPAL integrations]", ...args);
}

function sha256(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex");
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
  ];
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

  const readings = Array.isArray(latest?.results) ? latest.results : [];
  const pm25 = readings.find((r: any) => String(r.parameter?.name || r.parameter || "").toLowerCase().includes("pm2"));

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
  const openAqReadings: Record<string, unknown>[] = [];
  const numericGround: number[] = [];

  const maxLocations = Math.min(5, locResults.length);
  for (let i = 0; i < maxLocations; i++) {
    const loc = locResults[i];
    if (!loc?.id) continue;
    try {
      const latest = await fetchJson<any>(
        `https://api.openaq.org/v3/locations/${loc.id}/latest`,
        { headers: { "X-API-Key": apiKey } }
      );
      const readings = Array.isArray(latest?.results) ? latest.results : [];
      for (const r of readings) {
        const param = r.parameter?.name ?? r.parameter;
        openAqReadings.push({
          locationId: loc.id,
          locationName: loc.name ?? null,
          locality: loc.locality ?? null,
          country: loc.country ?? null,
          coordinates: loc.coordinates ?? null,
          parameter: param,
          value: r.value,
          unit: r.unit ?? null,
          datetime: r.datetime ?? null,
        });
        if (openAqParameterMatches(param, pollutantKey)) {
          const v = Number(r.value);
          if (Number.isFinite(v)) numericGround.push(v);
        }
      }
    } catch (err: any) {
      dlog("OpenAQ latest failed", loc.id, err?.message);
    }
  }

  const canCompare = Number.isFinite(satelliteNumeric) && numericGround.length > 0;
  const groundMean =
    numericGround.length > 0
      ? numericGround.reduce((a, b) => a + b, 0) / numericGround.length
      : NaN;

  let validationStatus: "confirmed" | "partial" | "conflicting" | "no_nearby_sensor" =
    "no_nearby_sensor";
  let confidenceScore = 0;

  if (numericGround.length === 0) {
    validationStatus = "no_nearby_sensor";
    confidenceScore = openAqReadings.length > 0 ? 0.12 : 0;
  } else if (!Number.isFinite(satelliteNumeric)) {
    validationStatus = "partial";
    confidenceScore = Math.min(0.45, 0.2 + numericGround.length * 0.06);
  } else {
    const denom = Math.max(Math.abs(satelliteNumeric), Math.abs(groundMean), 1e-6);
    const relDiff = Math.abs(satelliteNumeric - groundMean) / denom;

    if (relDiff <= 0.28) validationStatus = "confirmed";
    else if (relDiff <= 0.55) validationStatus = "partial";
    else validationStatus = "conflicting";

    const agreement = Math.max(0, 1 - Math.min(1, relDiff));
    const breadth = Math.min(1, numericGround.length / 4);
    let score = 0.5 * agreement + 0.35 * breadth;
    if (validationStatus === "confirmed") score += 0.1;
    if (validationStatus === "conflicting") score *= 0.45;
    confidenceScore = Math.round(Math.min(1, Math.max(0, score)) * 1000) / 1000;
  }

  const payloadForHash = {
    type: SATELLITE_VALIDATION_PACKET_TYPE,
    coordinates,
    signalType: pollutantKey,
    satelliteValue: satelliteRaw,
    validationStatus,
    groundSampleCount: numericGround.length,
    groundMean: Number.isFinite(groundMean) ? Number(groundMean.toFixed(4)) : null,
    openAqReadingCount: openAqReadings.length,
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
    ...(Number.isFinite(satelliteNumeric) && numericGround.length > 0
      ? {
          comparison: {
            satelliteNumeric,
            groundMean: Number(groundMean.toFixed(4)),
            groundSampleCount: numericGround.length,
          },
        }
      : {}),
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
  const data = await fetchJson<any>(
    "https://api.climatiq.io/data/v1/estimate",
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
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
