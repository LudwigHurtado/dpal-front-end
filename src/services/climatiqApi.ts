import { API_ROUTES, apiUrl } from '../../constants';

export type ClimatiqProviderEnvelope<T> =
  | { ok: true; provider: 'climatiq'; data: T }
  | { ok: false; provider: 'climatiq'; error: string };

export type ClimatiqHealthData = {
  ok: boolean;
  provider: 'climatiq';
  configured: boolean;
  dataVersion: string;
};

export type ClimatiqSearchFactor = {
  activity_id: string;
  id?: string;
  name?: string;
  region?: string;
  year?: number | string;
  sector?: string;
  category?: string;
  source?: string;
  source_link?: string;
  unit_type?: string;
  unit?: string;
  description?: string;
};

export type ClimatiqSearchData = {
  results?: ClimatiqSearchFactor[];
  current_page?: number;
  last_page?: number;
  total_results?: number;
};

export type ClimatiqEstimatePayload = {
  emission_factor: {
    activity_id: string;
    data_version?: string;
    region?: string;
  };
  parameters: Record<string, string | number>;
};

export type ClimatiqEstimateData = {
  co2e: number;
  co2e_unit: string;
  emission_factor?: {
    activity_id?: string;
    region?: string;
    year?: number | string;
    source?: string;
    data_version?: string;
    name?: string;
    category?: string;
    sector?: string;
  };
  notices?: unknown[];
  calculation_method?: string;
  calculation_origin?: string;
  activity_data?: { activity_value?: number; activity_unit?: string };
};

export type ClimatiqParameterKeys = {
  valueKey: string;
  unitKey: string;
  defaultUnit: string;
};

/** Map Climatiq unit_type to estimate request parameter keys. */
export function unitTypeToParameterKeys(unitType: string | undefined): ClimatiqParameterKeys {
  const t = (unitType || 'Energy').toLowerCase();
  if (t.includes('energy')) return { valueKey: 'energy', unitKey: 'energy_unit', defaultUnit: 'kWh' };
  if (t.includes('weight')) return { valueKey: 'weight', unitKey: 'weight_unit', defaultUnit: 'kg' };
  if (t.includes('distance')) return { valueKey: 'distance', unitKey: 'distance_unit', defaultUnit: 'km' };
  if (t.includes('volume')) return { valueKey: 'volume', unitKey: 'volume_unit', defaultUnit: 'l' };
  if (t.includes('money')) return { valueKey: 'money', unitKey: 'money_unit', defaultUnit: 'usd' };
  if (t.includes('time')) return { valueKey: 'time', unitKey: 'time_unit', defaultUnit: 'hour' };
  if (t.includes('number')) return { valueKey: 'number', unitKey: 'number_unit', defaultUnit: '' };
  if (t.includes('data')) return { valueKey: 'data', unitKey: 'data_unit', defaultUnit: 'GB' };
  if (t.includes('area')) return { valueKey: 'area', unitKey: 'area_unit', defaultUnit: 'm2' };
  return { valueKey: 'energy', unitKey: 'energy_unit', defaultUnit: 'kWh' };
}

async function parseEnvelope<T>(res: Response): Promise<ClimatiqProviderEnvelope<T>> {
  const body = (await res.json().catch(() => null)) as ClimatiqProviderEnvelope<T> | null;
  if (!body || typeof body !== 'object' || body.provider !== 'climatiq') {
    return { ok: false, provider: 'climatiq', error: `Unexpected response (${res.status})` };
  }
  return body;
}

export async function getClimatiqHealth(signal?: AbortSignal): Promise<ClimatiqHealthData | null> {
  try {
    const res = await fetch(apiUrl(API_ROUTES.CLIMATIQ_HEALTH), {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal,
    });
    const data = (await res.json().catch(() => null)) as ClimatiqHealthData | null;
    if (!res.ok || !data?.ok) return null;
    return data;
  } catch {
    return null;
  }
}

export async function searchClimatiqFactors(
  params: {
    query: string;
    region?: string;
    year?: string;
    sector?: string;
    scope?: string;
    unit_type?: string;
    results_per_page?: string;
  },
  signal?: AbortSignal,
): Promise<ClimatiqProviderEnvelope<ClimatiqSearchData>> {
  const url = new URL(apiUrl(API_ROUTES.CLIMATIQ_SEARCH));
  url.searchParams.set('query', params.query || 'electricity');
  url.searchParams.set('results_per_page', params.results_per_page || '10');
  if (params.region) url.searchParams.set('region', params.region);
  if (params.year) url.searchParams.set('year', params.year);
  if (params.sector) url.searchParams.set('sector', params.sector);
  if (params.scope) url.searchParams.set('scope', params.scope);
  if (params.unit_type) url.searchParams.set('unit_type', params.unit_type);

  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: { Accept: 'application/json' },
    signal,
  });
  return parseEnvelope<ClimatiqSearchData>(res);
}

export async function estimateClimatiqEmissions(
  payload: ClimatiqEstimatePayload,
  signal?: AbortSignal,
): Promise<ClimatiqProviderEnvelope<ClimatiqEstimateData>> {
  const res = await fetch(apiUrl(API_ROUTES.CLIMATIQ_ESTIMATE), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(payload),
    signal,
  });
  return parseEnvelope<ClimatiqEstimateData>(res);
}
