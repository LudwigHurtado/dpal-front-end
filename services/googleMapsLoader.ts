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
    // `importLibrary` is the current supported API (works across versions).
    await (loader as any).importLibrary('maps');
    await (loader as any).importLibrary('places');
    return google;
  })();

  return loaderPromise;
}

