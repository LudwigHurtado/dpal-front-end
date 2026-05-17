import { useEffect, useState } from 'react';
import type { EnvironmentalProviderStripItem } from '../shared/EnvironmentalProviderStatusStrip';
import type { EnvironmentalProviderUiState } from '../shared/environmentalServiceStatus';
import { getUsgs3depStatus } from '../services/usgs3depApi';

function statusToUi(enabled: boolean, configured: boolean): EnvironmentalProviderUiState {
  if (!configured) return 'not_configured';
  if (enabled) return 'live';
  return 'unavailable';
}

/** Hub / module provider strip row for USGS 3DEP (no API key). */
export function useUsgs3depProviderStripItem(): EnvironmentalProviderStripItem {
  const [item, setItem] = useState<EnvironmentalProviderStripItem>({
    id: 'usgs-3dep',
    label: 'USGS 3DEP terrain',
    state: 'partial',
    hint: 'Checking elevation provider…',
  });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const status = await getUsgs3depStatus();
      if (cancelled) return;
      if (!status) {
        setItem({
          id: 'usgs-3dep',
          label: 'USGS 3DEP terrain',
          state: 'unavailable',
          hint: 'Terrain API not reachable on configured host',
        });
        return;
      }
      setItem({
        id: 'usgs-3dep',
        label: 'USGS 3DEP terrain',
        state: statusToUi(status.enabled, status.elevationEndpointConfigured),
        hint: status.enabled
          ? 'Public EPQS elevation — no API key'
          : 'Set USGS_3DEP_ENABLED on API host',
      });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return item;
}
