import { useCallback, useEffect, useState } from 'react';
import { API_ROUTES, apiUrl, getApiBase } from '../../../../../constants';
import { fetchCopernicusSetupState } from '../../../../../services/copernicus/processService';
import {
  getDroneValidationStatus,
  getHyperspectralPlasticProviderStatus,
} from '../../../hyperspectralPlasticWatch/services/hyperspectralPlasticApi';
import type { ProviderSourceStatusEntry } from '../../../environmentalIntegrity/environmentalIntegrityTypes';
import {
  buildCarbonPuraSourceMatrix,
  type CarbonPuraProbeSnapshot,
} from '../carbonPuraSourceStatusMatrix';

export type CarbonPuraLiveStatusSnapshot = {
  loading: boolean;
  apiReachable: boolean | null;
  apiDetail: string;
  sources: ProviderSourceStatusEntry[];
  refreshedAtIso: string | null;
};

export function useCarbonPuraLiveStatus(): CarbonPuraLiveStatusSnapshot & { refresh: () => void } {
  const [snapshot, setSnapshot] = useState<CarbonPuraLiveStatusSnapshot>({
    loading: true,
    apiReachable: null,
    apiDetail: 'Checking DPAL API…',
    sources: [],
    refreshedAtIso: null,
  });

  const load = useCallback(async (signal: AbortSignal) => {
    setSnapshot((prev) => ({ ...prev, loading: true }));
    const now = new Date().toISOString();
    const probe: CarbonPuraProbeSnapshot = {
      checkedAtIso: now,
      apiReachable: null,
      apiDetail: 'Checking DPAL API…',
      plastic: null,
      plasticError: null,
      droneConfigured: null,
      droneEnabled: null,
      droneMessage: null,
      droneError: null,
      copernicus: null,
      copernicusError: null,
      waterStatsOk: null,
      waterStatsError: null,
    };

    try {
      const healthRes = await fetch(`${getApiBase()}/health`, { signal, headers: { Accept: 'application/json' } });
      probe.apiReachable = healthRes.ok;
      probe.apiDetail = probe.apiReachable
        ? `DPAL API reachable (${getApiBase()})`
        : `DPAL API health check returned ${healthRes.status} (${getApiBase()})`;
    } catch {
      probe.apiReachable = false;
      probe.apiDetail = `Provider unavailable — could not reach ${getApiBase()}/health`;
    }

    try {
      probe.plastic = await getHyperspectralPlasticProviderStatus(signal);
    } catch (e) {
      probe.plasticError = e instanceof Error ? e.message : 'Provider status request failed';
    }

    try {
      const drone = await getDroneValidationStatus(signal);
      probe.droneConfigured = drone.configured;
      probe.droneEnabled = drone.enabled;
      probe.droneMessage = drone.message;
    } catch (e) {
      probe.droneError = e instanceof Error ? e.message : 'Drone status request failed';
    }

    try {
      probe.copernicus = await fetchCopernicusSetupState(signal);
    } catch (e) {
      probe.copernicusError = e instanceof Error ? e.message : 'Copernicus status failed';
    }

    try {
      const waterRes = await fetch(apiUrl(API_ROUTES.WATER_STATS), { signal, headers: { Accept: 'application/json' } });
      probe.waterStatsOk = waterRes.ok;
      if (!waterRes.ok) {
        probe.waterStatsError = `Water API returned HTTP ${waterRes.status}`;
      }
    } catch (e) {
      probe.waterStatsOk = false;
      probe.waterStatsError = e instanceof Error ? e.message : 'Water stats request failed';
    }

    const sources = buildCarbonPuraSourceMatrix(probe);

    setSnapshot({
      loading: false,
      apiReachable: probe.apiReachable,
      apiDetail: probe.apiDetail,
      sources,
      refreshedAtIso: now,
    });
  }, []);

  const refresh = useCallback(() => {
    const ac = new AbortController();
    void load(ac.signal);
    return () => ac.abort();
  }, [load]);

  useEffect(() => {
    const ac = new AbortController();
    void load(ac.signal);
    return () => ac.abort();
  }, [load]);

  return { ...snapshot, refresh };
}
