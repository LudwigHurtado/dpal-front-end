type SmokeResponse = {
  ok: boolean;
  statusReady: boolean;
  hasQualityCoverage: boolean;
  emptySearchHasRealRows: boolean;
  noBinaryGarbageRows: boolean;
  shellSearchCount: number;
  refinerySearchCount: number;
  year2024SearchCount: number;
  failures: string[];
  warnings: string[];
};

function ensureUrl(input: string): string {
  return input.endsWith('/') ? input.slice(0, -1) : input;
}

async function readJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  const text = await response.text();
  let body: unknown = null;
  try {
    body = JSON.parse(text);
  } catch {
    throw new Error(`Invalid JSON from ${url}: ${text.slice(0, 300)}`);
  }
  if (!response.ok) {
    throw new Error(`Request failed ${response.status} for ${url}: ${JSON.stringify(body).slice(0, 500)}`);
  }
  return body as T;
}

async function main(): Promise<void> {
  const base = ensureUrl(process.env.CARB_API_BASE?.trim() || 'https://web-production-a27b.up.railway.app');
  const smokeUrl = `${base}/api/carb-data/smoke`;
  const statusUrl = `${base}/api/carb-data/status`;

  const status = await readJson<Record<string, unknown>>(statusUrl);
  const smoke = await readJson<SmokeResponse>(smokeUrl);

  // Keep output concise and parseable in CI logs.
  console.log(JSON.stringify({
    endpoint: smokeUrl,
    statusSnapshot: {
      sourceMode: status.sourceMode,
      datasetVersion: status.datasetVersion,
      recordCount: status.recordCount,
      searchReadiness: status.searchReadiness,
    },
    smoke,
  }, null, 2));

  if (!smoke.ok) {
    process.exitCode = 1;
  }
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});

