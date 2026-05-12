/**
 * Smoke check for Forest Integrity API (expects local backend on PORT or FOREST_INTEGRITY_SMOKE_BASE).
 *
 * Usage:
 *   cd backend && npm run smoke:forest-integrity
 *
 * Prints:
 *   - scanId
 *   - riskLevel
 *   - GFW provider status
 *   - GFW alert count (and integrated/disturbance subcounts when present)
 *   - GFW limitations (when present)
 */

type ProviderStatusBody = {
  ok?: boolean;
  earthObservationLive?: boolean;
  nasaFirmsConfigured?: boolean;
  gfwConfigured?: boolean;
  gediImplemented?: boolean;
  notes?: string[];
};

type GfwProviderBlock = {
  status?: string;
  message?: string;
  alerts?: number | null;
  integratedAlerts?: number | null;
  disturbanceAlerts?: number | null;
  datasetVersionsUsed?: string[];
  queriedAt?: string | null;
  limitations?: string[];
};

type ScanBody = {
  ok?: boolean;
  scanId?: string;
  riskLevel?: string;
  forestIntegrityScore?: number | null;
  providers?: {
    gfw?: GfwProviderBlock;
  };
};

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

  const status = await readJson<ProviderStatusBody>(statusUrl);
  const scan = await readJson<ScanBody>(scanUrl);

  const gfw = scan?.providers?.gfw ?? {};
  const summary = {
    statusUrl,
    providerStatus: {
      earthObservationLive: status.earthObservationLive,
      nasaFirmsConfigured: status.nasaFirmsConfigured,
      gfwConfigured: status.gfwConfigured,
      gediImplemented: status.gediImplemented,
      notes: status.notes,
    },
    scanUrl,
    scan: {
      ok: scan.ok,
      scanId: scan.scanId,
      riskLevel: scan.riskLevel,
      forestIntegrityScore: scan.forestIntegrityScore ?? null,
    },
    gfw: {
      providerStatus: gfw.status ?? 'unknown',
      message: gfw.message ?? '',
      alertsCount: typeof gfw.alerts === 'number' ? gfw.alerts : null,
      integratedAlertsCount: typeof gfw.integratedAlerts === 'number' ? gfw.integratedAlerts : null,
      disturbanceAlertsCount: typeof gfw.disturbanceAlerts === 'number' ? gfw.disturbanceAlerts : null,
      datasetVersionsUsed: gfw.datasetVersionsUsed ?? [],
      queriedAt: gfw.queriedAt ?? null,
      limitations: Array.isArray(gfw.limitations) ? gfw.limitations : [],
    },
  };

  console.log(JSON.stringify(summary, null, 2));

  console.log('---');
  console.log(`scanId: ${scan.scanId ?? 'unknown'}`);
  console.log(`riskLevel: ${scan.riskLevel ?? 'unknown'}`);
  console.log(`GFW provider status: ${gfw.status ?? 'unknown'}`);
  console.log(
    `GFW alert count: ${
      typeof gfw.alerts === 'number'
        ? gfw.alerts
        : 'n/a (no available lane returned a count)'
    }`,
  );
  if (Array.isArray(gfw.limitations) && gfw.limitations.length > 0) {
    console.log('GFW limitations:');
    for (const line of gfw.limitations) {
      console.log(`  - ${line}`);
    }
  }

  if (scan.ok !== true) {
    process.exitCode = 1;
  }
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});

export {};
