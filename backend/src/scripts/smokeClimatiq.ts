/**
 * Climatiq proxy smoke — health, search, estimate (live when CLIMATIQ_API_KEY is set).
 * Run from backend/: `npm run smoke:climatiq`
 */
import 'dotenv/config';
import assert from 'node:assert/strict';
import {
  estimateClimatiqEmissions,
  isClimatiqConfigured,
  searchClimatiqFactors,
} from '../services/climatiqClient';

function fail(message: string): never {
  console.error('[smokeClimatiq] FAIL:', message);
  process.exit(1);
}

async function main(): Promise<void> {
  const configured = isClimatiqConfigured();
  console.log('[smokeClimatiq] CLIMATIQ_API_KEY configured:', configured);
  console.log('[smokeClimatiq] CLIMATIQ_DATA_VERSION:', process.env.CLIMATIQ_DATA_VERSION?.trim() || '^21 (default)');

  if (!configured) {
    console.log('[smokeClimatiq] SKIP live Climatiq calls — set CLIMATIQ_API_KEY in backend/.env to run full smoke.');
    process.exit(0);
  }

  const search = (await searchClimatiqFactors({ query: 'electricity', results_per_page: '5' })) as {
    results?: unknown[];
  };
  assert(Array.isArray(search.results), 'search returns results array');
  assert(search.results!.length > 0, 'search returns at least one factor for electricity');

  const estimate = (await estimateClimatiqEmissions({
    emission_factor: { activity_id: 'electricity-supply_grid-source_residual_mix' },
    parameters: { energy: 100, energy_unit: 'kWh' },
  })) as { co2e?: number; co2e_unit?: string };

  assert(typeof estimate.co2e === 'number', 'estimate returns numeric co2e');
  assert(typeof estimate.co2e_unit === 'string' && estimate.co2e_unit.length > 0, 'estimate returns co2e_unit');

  console.log('[smokeClimatiq] OK — search results:', search.results!.length, 'estimate co2e:', estimate.co2e, estimate.co2e_unit);
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  fail(message);
});
