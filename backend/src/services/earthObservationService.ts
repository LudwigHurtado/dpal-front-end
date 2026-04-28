type AnalysisType =
  | 'deforestation'
  | 'agriculture'
  | 'pollution'
  | 'carbon'
  | 'flood_fire'
  | 'urban'
  | 'water'
  | 'heat';

type SourceMode = 'LIVE' | 'IMPORTED' | 'DEMO_FALLBACK' | 'UNAVAILABLE';
type SignalStatus = 'verified' | 'partially_verified' | 'not_verified' | 'insufficient_data';
type RiskLevel = 'low' | 'moderate' | 'high' | 'unknown';
type ProcessingStage = 'product_found' | 'imagery_loaded' | 'metric_computed' | 'field_verified';

type ScanRequest = {
  analysisType: AnalysisType;
  latitude: number;
  longitude: number;
  radiusKm: number;
  startDate: string;
  endDate: string;
};

type ScanSource = {
  name: string;
  product: string;
  acquisitionDate: string;
  url: string | null;
};

type SceneRef = {
  sceneId: string;
  acquisitionDate: string | null;
  cloudCoverage: number | null;
  source: string;
};

type ScanResponse = {
  ok: true;
  sourceMode: SourceMode;
  analysisType: AnalysisType;
  location: {
    latitude: number;
    longitude: number;
    radiusKm: number;
  };
  signalStatus: SignalStatus;
  primarySignal: string;
  riskLevel: RiskLevel;
  confidence: number | null;
  confidenceLabel: string;
  processingStage: ProcessingStage;
  beforeScene: SceneRef | null;
  afterScene: SceneRef | null;
  metricMethod: string;
  limitations: string[];
  sources: ScanSource[];
  metrics: {
    ndviBefore: number | null;
    ndviAfter: number | null;
    ndviChange: number | null;
    nbrBefore: number | null;
    nbrAfter: number | null;
    nbrChange: number | null;
    ndmiBefore: number | null;
    ndmiAfter: number | null;
    ndmiChange: number | null;
    ndwiBefore: number | null;
    ndwiAfter: number | null;
    ndwiChange: number | null;
    cloudCoverage: number | null;
    usablePixelPercent: number | null;
  };
  summary: string;
  recommendedActions: string[];
  legalDisclaimer: string;
};

type PcScene = {
  id: string;
  collection: string;
  datetime: string | null;
  cloud: number | null;
};

const LEGAL_DISCLAIMER =
  'The result is a remote-sensing screening signal and requires field verification before legal, regulatory, insurance, carbon-credit, or enforcement use.';

const NASA_CMR_STAC = 'https://cmr.earthdata.nasa.gov/stac/LPCLOUD/search';
const COPERNICUS_STAC = 'https://catalogue.dataspace.copernicus.eu/stac/search';
const NASA_GIBS_EPSG4326 =
  'https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi?service=WMS&request=GetCapabilities';
const PC_STAC_SEARCH = 'https://planetarycomputer.microsoft.com/api/stac/v1/search';
const PC_DATA_ITEM_STATS = 'https://planetarycomputer.microsoft.com/api/data/v1/item/statistics';
const LANDSAT_COLLECTION = 'landsat-c2-l2';
const LANDSAT_SCALE = 0.0000275;
const LANDSAT_OFFSET = -0.2;

const analysisMap: Record<AnalysisType, { hlsQuery: string[]; sentinelCollection: string; suggestedAction: string }> = {
  deforestation: {
    hlsQuery: ['HLS', 'NDVI', 'NBR', 'tree loss'],
    sentinelCollection: 'SENTINEL-2',
    suggestedAction: 'Create a field verification mission and request geotagged photo evidence for canopy change.',
  },
  agriculture: {
    hlsQuery: ['HLS', 'NDVI', 'NDMI', 'crop stress'],
    sentinelCollection: 'SENTINEL-2',
    suggestedAction: 'Launch an agricultural stress verification mission and capture crop/soil photos with GPS.',
  },
  pollution: {
    hlsQuery: ['HLS', 'smoke', 'dust'],
    sentinelCollection: 'SENTINEL-5P',
    suggestedAction: 'Open a community reporting mission and collect timestamped visible plume/odor evidence.',
  },
  carbon: {
    hlsQuery: ['HLS', 'land cover', 'carbon'],
    sentinelCollection: 'SENTINEL-2',
    suggestedAction: 'Trigger a carbon-project ground check with plot photos and boundary validation.',
  },
  flood_fire: {
    hlsQuery: ['HLS', 'burn', 'flood'],
    sentinelCollection: 'SENTINEL-1',
    suggestedAction: 'Start an emergency validation mission for burn/flood extent and impacted assets.',
  },
  urban: {
    hlsQuery: ['HLS', 'urban expansion', 'land cover'],
    sentinelCollection: 'SENTINEL-2',
    suggestedAction: 'Create an urban change mission with street-level documentation and local planning context.',
  },
  water: {
    hlsQuery: ['HLS', 'water extent', 'NDMI'],
    sentinelCollection: 'SENTINEL-1',
    suggestedAction: 'Open a water monitoring mission and gather waterline photos plus quality observations.',
  },
  heat: {
    hlsQuery: ['HLS', 'thermal', 'heat'],
    sentinelCollection: 'SENTINEL-3',
    suggestedAction: 'Schedule a heat-risk check mission for vulnerable sites and collect on-ground conditions.',
  },
};

const isoDate = (value: string): string => {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return new Date().toISOString();
  return date.toISOString();
};

function inferConfidenceLabel(confidence: number | null): string {
  if (confidence == null) return 'Not available';
  if (confidence >= 0.75) return 'High';
  if (confidence >= 0.5) return 'Moderate';
  return 'Low';
}

function unavailableResponse(input: ScanRequest, summary: string): ScanResponse {
  return {
    ok: true,
    sourceMode: 'UNAVAILABLE',
    analysisType: input.analysisType,
    location: {
      latitude: input.latitude,
      longitude: input.longitude,
      radiusKm: input.radiusKm,
    },
    signalStatus: 'not_verified',
    primarySignal: 'No verified satellite signal available yet.',
    riskLevel: 'unknown',
    confidence: null,
    confidenceLabel: 'Not available',
    processingStage: 'product_found',
    beforeScene: null,
    afterScene: null,
    metricMethod: 'No metric method executed.',
    limitations: [
      'No usable imagery was processed for index calculation.',
      'Field verification is required before making claims.',
    ],
    sources: [],
    metrics: {
      ndviBefore: null,
      ndviAfter: null,
      ndviChange: null,
      nbrBefore: null,
      nbrAfter: null,
      nbrChange: null,
      ndmiBefore: null,
      ndmiAfter: null,
      ndmiChange: null,
      ndwiBefore: null,
      ndwiAfter: null,
      ndwiChange: null,
      cloudCoverage: null,
      usablePixelPercent: null,
    },
    summary,
    recommendedActions: [analysisMap[input.analysisType].suggestedAction],
    legalDisclaimer: LEGAL_DISCLAIMER,
  };
}

async function fetchJson(url: string, body: Record<string, unknown>): Promise<any | null> {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) return null;
    return await response.json().catch(() => null);
  } catch {
    return null;
  }
}

function toReflectance(value: number | null | undefined): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return value * LANDSAT_SCALE + LANDSAT_OFFSET;
}

function calcIndex(numeratorA: number | null, numeratorB: number | null): number | null {
  if (numeratorA == null || numeratorB == null) return null;
  const denominator = numeratorA + numeratorB;
  if (!Number.isFinite(denominator) || Math.abs(denominator) < 1e-8) return null;
  return Number(((numeratorA - numeratorB) / denominator).toFixed(4));
}

function delta(afterVal: number | null, beforeVal: number | null): number | null {
  if (afterVal == null || beforeVal == null) return null;
  return Number((afterVal - beforeVal).toFixed(4));
}

function pointBbox(lat: number, lng: number, radiusKm: number): [number, number, number, number] {
  const latDelta = Math.max(0.01, radiusKm / 111.32);
  const lngDelta = Math.max(0.01, radiusKm / (111.32 * Math.max(0.2, Math.cos((lat * Math.PI) / 180))));
  return [lng - lngDelta, lat - latDelta, lng + lngDelta, lat + latDelta];
}

async function fetchNasaHlsSource(input: ScanRequest): Promise<ScanSource | null> {
  const query = analysisMap[input.analysisType];
  const [minLng, minLat, maxLng, maxLat] = pointBbox(input.latitude, input.longitude, input.radiusKm);
  const payload = {
    limit: 1,
    collections: ['HLSS30.v2.0', 'HLSL30.v2.0'],
    bbox: [minLng, minLat, maxLng, maxLat],
    datetime: `${input.startDate}/${input.endDate}`,
    query: {
      'eo:cloud_cover': { lt: 80 },
    },
    sortby: [{ field: 'properties.datetime', direction: 'desc' }],
    q: query.hlsQuery.join(' '),
  };
  const data = await fetchJson(NASA_CMR_STAC, payload);
  const feature = Array.isArray(data?.features) ? data.features[0] : null;
  if (!feature) return null;
  return {
    name: 'NASA HLS',
    product: String(feature.collection ?? 'HLS (Harmonized Landsat Sentinel-2)'),
    acquisitionDate: isoDate(String(feature.properties?.datetime ?? input.endDate)),
    url: String(feature?.links?.[0]?.href ?? feature?.assets?.browse?.href ?? null),
  };
}

async function fetchCopernicusSource(input: ScanRequest): Promise<ScanSource | null> {
  const query = analysisMap[input.analysisType];
  const [minLng, minLat, maxLng, maxLat] = pointBbox(input.latitude, input.longitude, input.radiusKm);
  const payload = {
    limit: 1,
    bbox: [minLng, minLat, maxLng, maxLat],
    datetime: `${input.startDate}/${input.endDate}`,
    collections: [query.sentinelCollection],
    sortby: [{ field: 'properties.datetime', direction: 'desc' }],
  };
  const data = await fetchJson(COPERNICUS_STAC, payload);
  const feature = Array.isArray(data?.features) ? data.features[0] : null;
  if (!feature) return null;
  return {
    name: 'Copernicus Sentinel',
    product: String(feature.collection ?? query.sentinelCollection),
    acquisitionDate: isoDate(String(feature.properties?.datetime ?? input.endDate)),
    url: String(feature?.links?.[0]?.href ?? null),
  };
}

async function fetchFirmsSource(input: ScanRequest): Promise<ScanSource | null> {
  if (input.analysisType !== 'flood_fire') return null;
  const mapKey = process.env.NASA_FIRMS_MAP_KEY?.trim();
  if (!mapKey) return null;
  const days = Math.max(1, Math.min(10, Math.ceil((new Date(input.endDate).getTime() - new Date(input.startDate).getTime()) / 86400000)));
  const url = `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${mapKey}/VIIRS_SNPP_NRT/${input.longitude},${input.latitude},${input.radiusKm},${days}`;
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const text = await response.text();
    const lines = text.split(/\r?\n/).filter(Boolean);
    if (lines.length <= 1) return null;
    return {
      name: 'NASA FIRMS',
      product: 'VIIRS Active Fire NRT',
      acquisitionDate: new Date().toISOString(),
      url,
    };
  } catch {
    return null;
  }
}

async function fetchPcScenes(input: ScanRequest): Promise<PcScene[]> {
  const [minLng, minLat, maxLng, maxLat] = pointBbox(input.latitude, input.longitude, input.radiusKm);
  const payload = {
    collections: [LANDSAT_COLLECTION],
    bbox: [minLng, minLat, maxLng, maxLat],
    datetime: `${input.startDate}/${input.endDate}`,
    limit: 20,
    query: { 'eo:cloud_cover': { lt: 70 } },
    sortby: [{ field: 'properties.datetime', direction: 'asc' }],
  };
  const data = await fetchJson(PC_STAC_SEARCH, payload);
  const features = Array.isArray(data?.features) ? data.features : [];
  return features.map((feature: any) => ({
    id: String(feature?.id ?? ''),
    collection: String(feature?.collection ?? LANDSAT_COLLECTION),
    datetime: feature?.properties?.datetime ? String(feature.properties.datetime) : null,
    cloud: typeof feature?.properties?.['eo:cloud_cover'] === 'number'
      ? Number(feature.properties['eo:cloud_cover'])
      : null,
  })).filter((scene: PcScene) => Boolean(scene.id));
}

async function fetchPcSceneStats(scene: PcScene): Promise<{
  red: number | null;
  nir: number | null;
  swir1: number | null;
  swir2: number | null;
  green: number | null;
} | null> {
  try {
    const params = new URLSearchParams();
    params.append('collection', LANDSAT_COLLECTION);
    params.append('item', scene.id);
    params.append('assets', 'red');
    params.append('assets', 'nir08');
    params.append('assets', 'swir16');
    params.append('assets', 'swir22');
    params.append('assets', 'green');
    const response = await fetch(`${PC_DATA_ITEM_STATS}?${params.toString()}`);
    if (!response.ok) return null;
    const payload = await response.json().catch(() => null) as Record<string, any> | null;
    if (!payload) return null;
    return {
      red: toReflectance(typeof payload?.red_b1?.mean === 'number' ? payload.red_b1.mean : null),
      nir: toReflectance(typeof payload?.nir08_b1?.mean === 'number' ? payload.nir08_b1.mean : null),
      swir1: toReflectance(typeof payload?.swir16_b1?.mean === 'number' ? payload.swir16_b1.mean : null),
      swir2: toReflectance(typeof payload?.swir22_b1?.mean === 'number' ? payload.swir22_b1.mean : null),
      green: toReflectance(typeof payload?.green_b1?.mean === 'number' ? payload.green_b1.mean : null),
    };
  } catch {
    return null;
  }
}

function deriveRisk(input: {
  analysisType: AnalysisType;
  ndviChange: number | null;
  nbrChange: number | null;
  ndmiChange: number | null;
  ndwiChange: number | null;
}): { riskLevel: RiskLevel; primarySignal: string; summary: string } {
  const ndviDrop = input.ndviChange != null && input.ndviChange <= -0.08;
  const nbrDrop = input.nbrChange != null && input.nbrChange <= -0.1;
  const ndmiDrop = input.ndmiChange != null && input.ndmiChange <= -0.08;
  const ndwiAbs = input.ndwiChange != null && Math.abs(input.ndwiChange) >= 0.08;

  if (input.analysisType === 'flood_fire' && nbrDrop) {
    return {
      riskLevel: 'high',
      primarySignal: 'NBR decrease indicates possible burn or canopy disturbance in the AOI.',
      summary: 'NBR dropped between selected scenes. This can indicate burn disturbance, canopy damage, or land-cover disruption and requires field validation.',
    };
  }
  if (input.analysisType === 'water' && ndwiAbs) {
    return {
      riskLevel: 'moderate',
      primarySignal: 'NDWI changed between scenes, indicating possible water extent shift.',
      summary: 'NDWI change suggests potential expansion or reduction in water presence. Confirm with geotagged field photos and local context.',
    };
  }
  if (ndviDrop && (input.analysisType === 'deforestation' || input.analysisType === 'agriculture')) {
    return {
      riskLevel: 'moderate',
      primarySignal: 'NDVI decrease indicates vegetation loss or stress signal.',
      summary: 'NDVI decreased across the AOI. This may indicate vegetation clearing or stress and should be field-verified before attribution.',
    };
  }
  if (ndmiDrop && input.analysisType === 'agriculture') {
    return {
      riskLevel: 'moderate',
      primarySignal: 'NDMI decrease indicates moisture loss or drought-stress signal.',
      summary: 'NDMI declined in the selected window, consistent with possible moisture stress. Confirm with ground observations.',
    };
  }
  return {
    riskLevel: 'low',
    primarySignal: 'No strong adverse index shift detected for the selected period.',
    summary: 'Computed index changes are small for the selected date window. Continue monitoring and validate with field evidence when needed.',
  };
}

export const earthObservationService = {
  async scan(input: ScanRequest): Promise<ScanResponse> {
    const liveEnabled = process.env.EARTH_OBSERVATION_LIVE_ENABLED === 'true';
    if (!liveEnabled) {
      return unavailableResponse(
        input,
        'No verified satellite reading available yet. Backend adapter connected, but live imagery source is not configured.',
      );
    }

    const [nasaHls, copernicus, firms, pcScenes] = await Promise.all([
      fetchNasaHlsSource(input),
      fetchCopernicusSource(input),
      fetchFirmsSource(input),
      fetchPcScenes(input),
    ]);
    const sources = [nasaHls, copernicus, firms].filter((entry): entry is ScanSource => entry != null);

    const beforeScene = pcScenes.length > 0 ? pcScenes[0] : null;
    const afterScene = pcScenes.length > 1 ? pcScenes[pcScenes.length - 1] : null;

    if (!sources.length && !beforeScene && !afterScene) {
      return unavailableResponse(
        input,
        'Earth Observation adapter is live, but no usable products or imagery scenes were found for the selected area and date range.',
      );
    }

    const allSources = [
      ...sources,
      ...(beforeScene ? [{
        name: 'Microsoft Planetary Computer',
        product: `${LANDSAT_COLLECTION} (before scene)`,
        acquisitionDate: beforeScene.datetime ?? input.startDate,
        url: null,
      }] : []),
      ...(afterScene ? [{
        name: 'Microsoft Planetary Computer',
        product: `${LANDSAT_COLLECTION} (after scene)`,
        acquisitionDate: afterScene.datetime ?? input.endDate,
        url: null,
      }] : []),
      {
        name: 'NASA GIBS',
        product: 'Global Imagery Browse Services (WMTS/WMS/TWMS/TMS)',
        acquisitionDate: new Date().toISOString(),
        url: NASA_GIBS_EPSG4326,
      },
    ];

    let processingStage: ProcessingStage = 'product_found';
    let signalStatus: SignalStatus = 'insufficient_data';
    let confidence: number | null = null;
    let riskLevel: RiskLevel = 'unknown';
    let primarySignal = 'Satellite products were found, but DPAL did not compute verified index values yet.';
    let summary = 'Satellite products were found, but DPAL did not compute verified index values yet.';
    const limitations: string[] = [
      'This is an AOI-averaged remote-sensing screening signal, not parcel-level proof.',
      'Clouds, haze, seasonality, and mixed pixels can influence index values.',
      'Field verification is required before legal, regulatory, insurance, carbon-credit, or enforcement use.',
    ];

    const metrics = {
      ndviBefore: null as number | null,
      ndviAfter: null as number | null,
      ndviChange: null as number | null,
      nbrBefore: null as number | null,
      nbrAfter: null as number | null,
      nbrChange: null as number | null,
      ndmiBefore: null as number | null,
      ndmiAfter: null as number | null,
      ndmiChange: null as number | null,
      ndwiBefore: null as number | null,
      ndwiAfter: null as number | null,
      ndwiChange: null as number | null,
      cloudCoverage: null as number | null,
      usablePixelPercent: null as number | null,
    };

    if (beforeScene || afterScene) {
      processingStage = 'imagery_loaded';
      primarySignal = 'Imagery was loaded, but DPAL has not completed verified metric computation yet.';
      summary = 'Imagery was loaded, but DPAL did not compute verified index values yet.';
    }

    if (beforeScene && afterScene && beforeScene.id !== afterScene.id) {
      const [beforeStats, afterStats] = await Promise.all([
        fetchPcSceneStats(beforeScene),
        fetchPcSceneStats(afterScene),
      ]);
      if (beforeStats && afterStats) {
        metrics.ndviBefore = calcIndex(beforeStats.nir, beforeStats.red);
        metrics.ndviAfter = calcIndex(afterStats.nir, afterStats.red);
        metrics.ndviChange = delta(metrics.ndviAfter, metrics.ndviBefore);

        metrics.nbrBefore = calcIndex(beforeStats.nir, beforeStats.swir2);
        metrics.nbrAfter = calcIndex(afterStats.nir, afterStats.swir2);
        metrics.nbrChange = delta(metrics.nbrAfter, metrics.nbrBefore);

        metrics.ndmiBefore = calcIndex(beforeStats.nir, beforeStats.swir1);
        metrics.ndmiAfter = calcIndex(afterStats.nir, afterStats.swir1);
        metrics.ndmiChange = delta(metrics.ndmiAfter, metrics.ndmiBefore);

        metrics.ndwiBefore = calcIndex(beforeStats.green, beforeStats.nir);
        metrics.ndwiAfter = calcIndex(afterStats.green, afterStats.nir);
        metrics.ndwiChange = delta(metrics.ndwiAfter, metrics.ndwiBefore);

        const computedCount = [
          metrics.ndviChange,
          metrics.nbrChange,
          metrics.ndmiChange,
          metrics.ndwiChange,
        ].filter((value) => value != null).length;

        if (computedCount > 0) {
          processingStage = 'metric_computed';
          signalStatus = computedCount >= 3 ? 'verified' : 'partially_verified';
          const cloudValues = [beforeScene.cloud, afterScene.cloud]
            .filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
          metrics.cloudCoverage = cloudValues.length
            ? Number((cloudValues.reduce((acc, value) => acc + value, 0) / cloudValues.length).toFixed(1))
            : null;
          metrics.usablePixelPercent = metrics.cloudCoverage == null
            ? null
            : Number((100 - Math.max(0, Math.min(100, metrics.cloudCoverage))).toFixed(1));
          confidence = metrics.usablePixelPercent == null
            ? Number((0.4 + 0.15 * computedCount).toFixed(2))
            : Number(Math.max(0.25, Math.min(0.92, (metrics.usablePixelPercent / 100) * (0.7 + computedCount * 0.07))).toFixed(2));
          const risk = deriveRisk({
            analysisType: input.analysisType,
            ndviChange: metrics.ndviChange,
            nbrChange: metrics.nbrChange,
            ndmiChange: metrics.ndmiChange,
            ndwiChange: metrics.ndwiChange,
          });
          riskLevel = risk.riskLevel;
          primarySignal = risk.primarySignal;
          summary = risk.summary;
        } else {
          limitations.push('Scene statistics loaded, but no stable index values were derivable from available means.');
        }
      } else {
        limitations.push('Before/after scenes were selected but imagery statistics could not be loaded.');
      }
    } else {
      limitations.push('Distinct before/after scenes were not available in the selected window.');
    }

    return {
      ok: true,
      sourceMode: 'LIVE',
      analysisType: input.analysisType,
      location: {
        latitude: input.latitude,
        longitude: input.longitude,
        radiusKm: input.radiusKm,
      },
      signalStatus,
      primarySignal,
      riskLevel,
      confidence,
      confidenceLabel: inferConfidenceLabel(confidence),
      processingStage,
      beforeScene: beforeScene ? {
        sceneId: beforeScene.id,
        acquisitionDate: beforeScene.datetime,
        cloudCoverage: beforeScene.cloud,
        source: `Microsoft Planetary Computer / ${LANDSAT_COLLECTION}`,
      } : null,
      afterScene: afterScene ? {
        sceneId: afterScene.id,
        acquisitionDate: afterScene.datetime,
        cloudCoverage: afterScene.cloud,
        source: `Microsoft Planetary Computer / ${LANDSAT_COLLECTION}`,
      } : null,
      metricMethod: 'Indices computed from Landsat Collection 2 Level-2 scene mean reflectance (red, green, nir08, swir16, swir22) using NDVI, NBR, NDMI, and NDWI formulas.',
      limitations,
      sources: allSources,
      metrics,
      summary,
      recommendedActions: [
        analysisMap[input.analysisType].suggestedAction,
        'Attach source links and schedule a validator review before public claims.',
      ],
      legalDisclaimer: LEGAL_DISCLAIMER,
    };
  },
};
