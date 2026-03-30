import { useEffect, useState } from 'react';
import { loadGoogleMaps } from '../../services/googleMapsLoader';

export function useGoogleMaps() {
  const [googleMaps, setGoogleMaps] = useState<typeof google | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    loadGoogleMaps()
      .then((g) => {
        if (!mounted) return;
        setGoogleMaps(g);
        setError(null);
      })
      .catch((e) => {
        if (!mounted) return;
        setError(String(e?.message || e));
      });
    return () => {
      mounted = false;
    };
  }, []);

  return { google: googleMaps, error, ready: Boolean(googleMaps) };
}

