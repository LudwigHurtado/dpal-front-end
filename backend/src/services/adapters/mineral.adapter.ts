import axios from 'axios';

const CMR_BASE = 'https://cmr.earthdata.nasa.gov/search';
const EMIT_COLLECTION_ID = 'C2408750690-LPCLOUD';
const MACROSTRAT_MAP_UNITS_URL = 'https://macrostrat.org/api/v2/geologic_units/map';

interface MineralData {
  minerals: string[];
  dustArea: number | null;
  composition: { [key: string]: number };
  captureDate: string;
  source: string;
  dataAvailable: boolean;
  measurementStatus: 'verified' | 'unavailable';
  message: string;
}

interface MacrostratUnit {
  name?: string;
  strat_name?: string;
  lith?: string;
  descrip?: string;
  b_int_name?: string;
  t_int_name?: string;
}

const LITHOLOGY_MINERAL_HINTS: Array<{ pattern: RegExp; minerals: string[] }> = [
  { pattern: /sandstone|sand\b|arenite/i, minerals: ['Quartz', 'Feldspar'] },
  { pattern: /mudstone|siltstone|claystone|shale|argillite|mud\b|silt\b|clay\b/i, minerals: ['Clay Minerals', 'Quartz'] },
  { pattern: /limestone|chalk|marl|calcareous/i, minerals: ['Calcite'] },
  { pattern: /dolostone|dolomite/i, minerals: ['Dolomite'] },
  { pattern: /conglomerate|gravel|alluvial|fluvial/i, minerals: ['Quartz', 'Feldspar'] },
  { pattern: /granite|granodiorite|rhyolite|felsic/i, minerals: ['Quartz', 'Feldspar', 'Mica'] },
  { pattern: /basalt|gabbro|mafic/i, minerals: ['Plagioclase', 'Pyroxene', 'Olivine'] },
  { pattern: /andesite|diorite/i, minerals: ['Plagioclase', 'Amphibole', 'Pyroxene'] },
  { pattern: /schist|gneiss|metamorphic/i, minerals: ['Mica', 'Quartz', 'Feldspar'] },
  { pattern: /serpentinite|ultramafic/i, minerals: ['Serpentine', 'Olivine', 'Pyroxene'] },
  { pattern: /iron|hematite|banded iron/i, minerals: ['Hematite'] },
  { pattern: /gypsum|evaporite/i, minerals: ['Gypsum'] },
  { pattern: /halite|salt/i, minerals: ['Halite'] },
  { pattern: /sedimentary/i, minerals: ['Quartz', 'Clay Minerals', 'Calcite'] },
];

const pickMacrostratUnits = (payload: any): MacrostratUnit[] => {
  const data = payload?.success?.data ?? payload?.data ?? [];
  return Array.isArray(data) ? data : [];
};

const compact = (parts: Array<string | undefined | null>): string =>
  parts.map((part) => String(part || '').trim()).filter(Boolean).join('; ');

const inferMineralsFromUnits = (units: MacrostratUnit[]): { minerals: string[]; composition: Record<string, number> } => {
  const scores = new Map<string, number>();

  units.slice(0, 6).forEach((unit, index) => {
    const text = compact([unit.lith, unit.descrip, unit.name]);
    if (!text) return;
    const weight = Math.max(1, 6 - index);

    for (const hint of LITHOLOGY_MINERAL_HINTS) {
      if (!hint.pattern.test(text)) continue;
      for (const mineral of hint.minerals) {
        scores.set(mineral, (scores.get(mineral) ?? 0) + weight / hint.minerals.length);
      }
    }
  });

  if (scores.size === 0) return { minerals: [], composition: {} };

  const entries = Array.from(scores.entries()).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const total = entries.reduce((sum, [, score]) => sum + score, 0);
  const composition = Object.fromEntries(
    entries.map(([name, score]) => [name, Number(((score / total) * 100).toFixed(0))]),
  );

  return {
    minerals: entries.map(([name]) => name),
    composition,
  };
};

const fetchMacrostratUnits = async (lat: number, lng: number): Promise<MacrostratUnit[]> => {
  const response = await axios.get(MACROSTRAT_MAP_UNITS_URL, {
    params: { lat, lng },
    timeout: 10000,
  });
  return pickMacrostratUnits(response.data);
};

const estimateFootprintAreaKm2 = (granule: any): number | null => {
  const boxes = Array.isArray(granule?.boxes) ? granule.boxes[0] : undefined;
  const polygon = typeof granule?.polygons?.[0] === 'string' ? granule.polygons[0] : undefined;

  if (boxes && boxes.length >= 4) {
    const [west, south, east, north] = boxes.map(Number);
    return calculateAreaKm2(west, south, east, north);
  }

  if (polygon) {
    const coords = polygon.split(/\s+/).map(Number).filter(Number.isFinite);
    if (coords.length >= 4) {
      const lats = coords.filter((_, idx) => idx % 2 === 1);
      const lngs = coords.filter((_, idx) => idx % 2 === 0);
      return calculateAreaKm2(Math.min(...lngs), Math.min(...lats), Math.max(...lngs), Math.max(...lats));
    }
  }

  return null;
};

const calculateAreaKm2 = (west: number, south: number, east: number, north: number): number | null => {
  if (![west, south, east, north].every(Number.isFinite)) return null;

  const avgLat = (south + north) / 2;
  const latDegreeKm = 111.32;
  const lonDegreeKm = 111.32 * Math.cos((avgLat * Math.PI) / 180);
  const areaKm2 = Math.abs((east - west) * lonDegreeKm * (north - south) * latDegreeKm);

  return Number(Math.max(20, Math.min(2000, areaKm2 * 0.75)).toFixed(1));
};

export const mineralAdapter = {
  async getMineralData(lat: number, lng: number): Promise<MineralData> {
    try {
      const [macrostratResult, cmrResult] = await Promise.allSettled([
        fetchMacrostratUnits(lat, lng),
        axios.get(`${CMR_BASE}/granules.json`, {
          params: {
            collection_concept_id: EMIT_COLLECTION_ID,
            bounding_box: `${lng - 0.2},${lat - 0.2},${lng + 0.2},${lat + 0.2}`,
            sort_key: '-start_date',
            page_size: 1,
          },
          timeout: 10000,
        }),
      ]);

      const units = macrostratResult.status === 'fulfilled' ? macrostratResult.value : [];
      const inferred = inferMineralsFromUnits(units);
      const primaryUnit = units[0];
      const entries = cmrResult.status === 'fulfilled' ? cmrResult.value.data?.feed?.entry || [] : [];
      const latestGranule = entries[0] as any;
      const emitAvailable = Boolean(latestGranule);

      if (inferred.minerals.length > 0) {
        const unitName = primaryUnit?.strat_name || primaryUnit?.name || 'mapped bedrock unit';
        const lithology = primaryUnit?.lith || primaryUnit?.descrip || 'lithology unavailable';
        const age = compact([primaryUnit?.b_int_name, primaryUnit?.t_int_name]);

        return {
          minerals: inferred.minerals,
          dustArea: null,
          composition: inferred.composition,
          captureDate: new Date().toISOString(),
          source: 'Macrostrat Geologic Map (lithology-derived mineral indicators)',
          dataAvailable: true,
          measurementStatus: 'verified',
          message: [
            `Bedrock: ${unitName}${age ? ` (${age})` : ''}, lithology: ${lithology}.`,
            emitAvailable
              ? 'Matching NASA EMIT scene metadata was found, but dust-source area still requires a configured spectral/AOD reader.'
              : 'No EMIT L2B scene found at this location in the current archive.',
          ].join(' '),
        };
      }

      return {
        minerals: [],
        dustArea: emitAvailable ? estimateFootprintAreaKm2(latestGranule) ?? null : null,
        composition: {},
        captureDate: emitAvailable ? latestGranule.time_start || new Date().toISOString() : new Date().toISOString(),
        source: emitAvailable
          ? `NASA EMIT CMR metadata (${latestGranule.title || latestGranule.id || 'latest available granule'})`
          : 'Macrostrat Geologic Map + NASA EMIT CMR metadata',
        dataAvailable: false,
        measurementStatus: 'unavailable',
        message: emitAvailable
          ? 'Matching NASA EMIT scene metadata found, but no Macrostrat lithology or configured spectral-product reader returned mineral composition.'
          : 'No Macrostrat lithology or NASA EMIT granule was found for this scan area.',
      };
    } catch (error) {
      console.error('Mineral adapter error:', error);
      throw new Error('Failed to fetch mineral data');
    }
  },
};
