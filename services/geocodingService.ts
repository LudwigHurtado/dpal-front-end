export interface ReverseGeocodeResult {
  displayName: string;
  shortName: string;
  city?: string;
  county?: string;
  state?: string;
  country?: string;
}

interface NominatimReverseResponse {
  display_name?: string;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    county?: string;
    state?: string;
    country?: string;
  };
}

export async function reverseGeocodeLatLng(
  latitude: number,
  longitude: number,
  signal?: AbortSignal,
): Promise<ReverseGeocodeResult> {
  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10&addressdetails=1`;
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error('Reverse geocoding unavailable');
  const data = (await response.json()) as NominatimReverseResponse;
  const addr = data.address ?? {};
  const city = addr.city ?? addr.town ?? addr.village ?? addr.municipality;
  const county = addr.county;
  const state = addr.state;

  // Build a human-friendly short name: "Washoe County, Nevada" or "Reno, Nevada"
  const nameParts: string[] = [];
  if (city) nameParts.push(city);
  else if (county) nameParts.push(county);
  if (state) nameParts.push(state);
  const shortName = nameParts.length > 0 ? nameParts.join(', ') : `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;

  const displayName = data.display_name
    ? `Map point near ${data.display_name.split(',').slice(0, 3).join(',').trim()}`
    : `Map point at ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;

  return { displayName, shortName, city, county, state, country: addr.country };
}
