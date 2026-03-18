import { Loader } from '@googlemaps/js-api-loader';

let loaderPromise: Promise<typeof google> | undefined;

export function loadGoogleMaps(): Promise<typeof google> {
  if (loaderPromise) return loaderPromise;

  const apiKey = (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY as string | undefined;
  if (!apiKey) {
    return Promise.reject(new Error('missing_google_maps_key'));
  }

  const loader = new Loader({
    apiKey,
    version: 'weekly',
    libraries: ['places'],
  });

  loaderPromise = (async () => {
    // Prefer `load()` for broad compatibility, fallback to `importLibrary`.
    if (typeof (loader as any).load === 'function') {
      await (loader as any).load();
    } else if (typeof (loader as any).importLibrary === 'function') {
      await (loader as any).importLibrary('maps');
      await (loader as any).importLibrary('places');
    } else {
      throw new Error('google_maps_loader_unsupported');
    }

    const g = (window as any).google as typeof google | undefined;
    if (!g?.maps) throw new Error('google_maps_load_failed');
    return g;
  })();

  return loaderPromise;
}

