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
      "surface_runoff",
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
  const precipitation: number[] = hourly?.precipitation ?? [];
  const rain: number[] = hourly?.rain ?? [];
  const runoff: number[] = hourly?.surface_runoff ?? [];

  const next24Precip = precipitation.slice(0, 24).reduce((a, b) => a + Number(b || 0), 0);
  const next24Rain = rain.slice(0, 24).reduce((a, b) => a + Number(b || 0), 0);
  const next24Runoff = runoff.slice(0, 24).reduce((a, b) => a + Number(b || 0), 0);
  const maxHourlyRain = Math.max(0, ...rain.slice(0, 24).map(Number));

  let score = 0;
  score += Math.min(35, next24Precip * 1.2);
  score += Math.min(25, next24Rain * 1.1);
  score += Math.min(25, next24Runoff * 5);
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
    method: "DPAL FloodGuard v0.1 = precipitation + rain + surface runoff + max hourly rain. Advisory only until calibrated locally.",
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
