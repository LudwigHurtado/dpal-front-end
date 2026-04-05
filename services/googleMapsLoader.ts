/**
 * Loads the **Maps JavaScript API** for the browser (Good Wheels, Locator, etc.).
 *
 * **Not** the Google **Navigation SDK** (Android/iOS native turn-by-turn). That SDK does not apply to this web bundle.
 *
 * **A→B driving routes** in Good Wheels use `google.maps.DirectionsService` → enable **Directions API** (or legacy Routes) on the same GCP project as the key. Also enable **Maps JavaScript API**, **Places API** (autocomplete), **Geocoding API** (address → lat/lng).
 *
 * Script uses `libraries=places,geometry` for Places + spherical helpers.
 */
let loaderPromise: Promise<typeof google> | undefined;

const getApiKey = (): string | undefined => {
  const env = (import.meta as any).env || {};
  const isLocalHost = typeof window !== 'undefined' && /^(localhost|127\.0\.0\.1)$/i.test(window.location.hostname);
  const localKey = (env.VITE_GOOGLE_MAPS_API_KEY_LOCAL as string | undefined)?.trim();
  const primaryKey = (env.VITE_GOOGLE_MAPS_API_KEY as string | undefined)?.trim();

  // On local dev we optionally allow a separate key (often with localhost-only referrer rules).
  if (isLocalHost && localKey) return localKey;
  return primaryKey;
};

const injectScript = (apiKey: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-dpal-google-maps="1"]') as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('google_maps_script_error')));
      // If already loaded, resolve quickly.
      if ((window as any).google?.maps) resolve();
      return;
    }
    const s = document.createElement('script');
    s.async = true;
    s.defer = true;
    s.dataset.dpalGoogleMaps = '1';
    // Using explicit v=weekly helps keep Places + Map behavior consistent.
    s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places,geometry&v=weekly`;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('google_maps_script_error'));
    document.head.appendChild(s);
  });
};

export function loadGoogleMaps(): Promise<typeof google> {
  if (loaderPromise) return loaderPromise;

  const apiKey = getApiKey();
  if (!apiKey) {
    return Promise.reject(new Error('missing_google_maps_key'));
  }

  loaderPromise = (async () => {
    // Direct script injection avoids breaking changes across loader versions.
    await injectScript(apiKey);

    const g = (window as any).google as typeof google | undefined;
    if (!g?.maps) throw new Error('google_maps_load_failed');
    return g;
  })();

  return loaderPromise.catch((err) => {
    // Allow retry after a failed load (e.g. key restrictions updated).
    loaderPromise = undefined;
    throw err;
  });
}

