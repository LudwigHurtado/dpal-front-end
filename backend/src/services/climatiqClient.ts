const CLIMATIQ_BASE_URL = 'https://api.climatiq.io/data/v1';

function getClimatiqHeaders(): Record<string, string> {
  const apiKey = process.env.CLIMATIQ_API_KEY?.trim();

  if (!apiKey) {
    throw new Error('CLIMATIQ_API_KEY is not configured');
  }

  return {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  };
}

function defaultDataVersion(): string {
  return process.env.CLIMATIQ_DATA_VERSION?.trim() || '^21';
}

function climatiqErrorMessage(data: unknown, fallback: string): string {
  if (data && typeof data === 'object') {
    const record = data as Record<string, unknown>;
    if (typeof record.message === 'string' && record.message.trim()) return record.message;
    if (typeof record.error === 'string' && record.error.trim()) return record.error;
  }
  return fallback;
}

export async function searchClimatiqFactors(params: {
  query: string;
  region?: string;
  year?: string;
  sector?: string;
  scope?: string;
  unit_type?: string;
  results_per_page?: string;
}): Promise<unknown> {
  const dataVersion = defaultDataVersion();

  const url = new URL(`${CLIMATIQ_BASE_URL}/search`);
  url.searchParams.set('data_version', dataVersion);
  url.searchParams.set('query', params.query || 'electricity');
  url.searchParams.set('results_per_page', params.results_per_page || '10');

  if (params.region) url.searchParams.set('region', params.region);
  if (params.year) url.searchParams.set('year', params.year);
  if (params.sector) url.searchParams.set('sector', params.sector);
  if (params.scope) url.searchParams.set('scope', params.scope);
  if (params.unit_type) url.searchParams.set('unit_type', params.unit_type);

  const response = await fetch(url, {
    method: 'GET',
    headers: getClimatiqHeaders(),
  });

  const data: unknown = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(climatiqErrorMessage(data, 'Climatiq search request failed'));
  }

  return data;
}

export type ClimatiqEstimatePayload = {
  emission_factor: {
    activity_id: string;
    data_version?: string;
    region?: string;
  };
  parameters: Record<string, string | number>;
};

export async function estimateClimatiqEmissions(payload: ClimatiqEstimatePayload): Promise<unknown> {
  const response = await fetch(`${CLIMATIQ_BASE_URL}/estimate`, {
    method: 'POST',
    headers: getClimatiqHeaders(),
    body: JSON.stringify({
      ...payload,
      emission_factor: {
        ...payload.emission_factor,
        data_version:
          payload.emission_factor.data_version || defaultDataVersion(),
      },
    }),
  });

  const data: unknown = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(climatiqErrorMessage(data, 'Climatiq estimate request failed'));
  }

  return data;
}

export function isClimatiqConfigured(): boolean {
  return Boolean(process.env.CLIMATIQ_API_KEY?.trim());
}
