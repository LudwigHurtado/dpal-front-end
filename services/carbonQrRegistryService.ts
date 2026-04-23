import { API_ROUTES, apiUrl, CARBON_PROJECT_QR_REGISTRY_DETAIL } from '../constants';

export interface CarbonQrRegistryPayload {
  projectCode: string;
  projectName: string;
  aoiId: string;
  siteName: string;
  coordinates: {
    latitude: number;
    longitude: number;
    formatted: string;
  };
  region: string;
  country: string;
  boundary: {
    name: string;
    hectares: number;
    polygonEstimateHa: number;
    points: Array<{ lat: number; lng: number }>;
    gpsPolygon: Array<{ lat: number; lng: number }>;
    color: string;
  };
  monitoringPeriod: {
    start: string;
    end: string;
    months: number;
  };
  aiReading: {
    modelVersion: string;
    sourceStack: string;
    activeLayer: string;
    scanReadiness: string;
    confidence: number;
    lastScanAt: string;
  };
  result: {
    grossProjectCo2e: number;
    grossBaselineCo2e: number;
    netCreditableCo2e: number;
    viuEligible: number;
    readiness: string;
  };
}

export interface CarbonQrRegistryEntry {
  id: string;
  registryUrl: string;
  favorite: boolean;
  createdAt: string;
  updatedAt: string;
  payload: CarbonQrRegistryPayload;
}

export async function saveCarbonQrRegistryEntry(payload: CarbonQrRegistryPayload): Promise<CarbonQrRegistryEntry> {
  const response = await fetch(apiUrl(API_ROUTES.CARBON_PROJECT_QR_REGISTRY), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`QR registry save failed (${response.status})`);
  }

  const data = await response.json();
  if (!data?.ok || !data?.entry) {
    throw new Error('QR registry save returned an invalid response.');
  }

  return data.entry as CarbonQrRegistryEntry;
}

export async function updateCarbonQrRegistryFavorite(entryId: string, favorite: boolean): Promise<CarbonQrRegistryEntry> {
  const response = await fetch(`${CARBON_PROJECT_QR_REGISTRY_DETAIL(entryId)}/favorite`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ favorite }),
  });

  if (!response.ok) {
    throw new Error(`QR registry favorite update failed (${response.status})`);
  }

  const data = await response.json();
  if (!data?.ok || !data?.entry) {
    throw new Error('QR registry favorite update returned an invalid response.');
  }

  return data.entry as CarbonQrRegistryEntry;
}
