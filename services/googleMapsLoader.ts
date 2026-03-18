let loaderPromise: Promise<typeof google> | undefined;

const getApiKey = (): string | undefined =>
  (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY as string | undefined;

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
    s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places&v=weekly`;
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

  return loaderPromise;
}

