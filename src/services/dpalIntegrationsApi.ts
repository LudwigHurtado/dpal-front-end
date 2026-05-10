function integrationsApiOrigin(): string {
  const raw =
    import.meta.env.VITE_API_BASE_URL ||
    import.meta.env.VITE_BACKEND_URL ||
    "https://web-production-a27b.up.railway.app";
  return raw.replace(/\/+$/, "");
}

/**
 * Build fetch URL without duplicating `/api` when the env base already ends with `/api`
 * and paths are written as `/api/...` (same pitfall as Verifier UI + VITE_API_BASE_URL).
 */
function integrationRequestUrl(path: string): string {
  const base = integrationsApiOrigin();
  const p = path.startsWith("/") ? path : `/${path}`;
  if (base.endsWith("/api") && (p === "/api" || p.startsWith("/api/"))) {
    const tail = p === "/api" ? "/" : p.replace(/^\/api/, "") || "/";
    const normalized = tail.startsWith("/") ? tail : `/${tail}`;
    return `${base}${normalized}`;
  }
  return `${base}${p}`;
}

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(integrationRequestUrl(path));
  if (!res.ok) throw new Error(`DPAL API ${res.status}: ${await res.text()}`);
  return res.json() as Promise<T>;
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(integrationRequestUrl(path), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`DPAL API ${res.status}: ${await res.text()}`);
  return res.json() as Promise<T>;
}

export function getDpalIntegrationStatus() {
  return getJson<{ ok: boolean; providers: any[] }>("/api/integrations/status");
}

export function getDpalCityIntelligence(lat: number, lng: number, city = "Selected City") {
  const q = new URLSearchParams({ lat: String(lat), lng: String(lng), city });
  return getJson<{ ok: boolean; packet: any }>(`/api/integrations/city-intelligence?${q.toString()}`);
}

export function getDpalFloodRisk(lat: number, lng: number) {
  const q = new URLSearchParams({ lat: String(lat), lng: String(lng) });
  return getJson<{ ok: boolean; result: any }>(`/api/integrations/flood-risk?${q.toString()}`);
}

export function getDpalAirQuality(lat: number, lng: number) {
  const q = new URLSearchParams({ lat: String(lat), lng: String(lng) });
  return getJson<{ ok: boolean; result: any }>(`/api/integrations/air-quality?${q.toString()}`);
}

export function geocodeDpalLocation(text: string) {
  const q = new URLSearchParams({ text });
  return getJson<{ ok: boolean; result: any }>(`/api/integrations/geocode?${q.toString()}`);
}

export function estimateDpalEmissions(body: {
  activity_id: string;
  data_version?: string;
  parameters: Record<string, unknown>;
}) {
  return postJson<{ ok: boolean; result: any }>("/api/integrations/emissions/estimate", body);
}

export function createDpalEvidencePacketPreview(body: Record<string, unknown>) {
  return postJson<{ ok: boolean; packet: any }>("/api/integrations/evidence/packet-preview", body);
}

export type WaterAlertEvidencePacketParams = {
  lat: number;
  lng: number;
  label?: string;
  usgsSite?: string;
};

export function getWaterAlertEvidencePacket(params: WaterAlertEvidencePacketParams) {
  const q = new URLSearchParams({
    lat: String(params.lat),
    lng: String(params.lng),
  });
  if (params.label?.trim()) q.set("label", params.label.trim());
  if (params.usgsSite?.trim()) q.set("usgsSite", params.usgsSite.trim());
  return getJson<{ ok?: boolean; packet?: any; [key: string]: any }>(
    `/api/integrations/water/alert-evidence-packet?${q.toString()}`,
  );
}
