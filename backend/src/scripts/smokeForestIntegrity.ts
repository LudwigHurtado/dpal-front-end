/**
 * Smoke check for Forest Integrity API (expects local backend on PORT or FOREST_INTEGRITY_SMOKE_BASE).
 *
 * Usage:
 *   cd backend && npm run build && node dist/scripts/smokeForestIntegrity.js
 */

async function readJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  const text = await response.text();
  let body: unknown = null;
  try {
    body = JSON.parse(text);
  } catch {
    throw new Error(`Invalid JSON from ${url}: ${text.slice(0, 240)}`);
  }
  if (!response.ok) {
    throw new Error(`Request failed ${response.status} for ${url}: ${JSON.stringify(body).slice(0, 400)}`);
  }
  return body as T;
}

function ensureUrl(input: string): string {
  return input.replace(/\/+$/, '');
}

async function main(): Promise<void> {
  const port = process.env.PORT ?? '3001';
  const base = ensureUrl(process.env.FOREST_INTEGRITY_SMOKE_BASE?.trim() || `http://127.0.0.1:${port}`);
  const statusUrl = `${base}/api/forest-integrity/provider-status`;
  const scanUrl = `${base}/api/forest-integrity/scan?lat=-3.4653&lng=-62.2159&radiusKm=15&label=Smoke&baselineDate=${encodeURIComponent(
    new Date(Date.now() - 180 * 86400000).toISOString(),
  )}&currentDate=${encodeURIComponent(new Date().toISOString())}`;

  const status = await readJson<Record<string, unknown>>(statusUrl);
  const scan = await readJson<Record<string, unknown>>(scanUrl);

  console.log(JSON.stringify({ statusUrl, status, scanUrl, scan: { ok: scan.ok, scanId: scan.scanId, riskLevel: scan.riskLevel } }, null, 2));

  if (scan.ok !== true) {
    process.exitCode = 1;
  }
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});

export {};