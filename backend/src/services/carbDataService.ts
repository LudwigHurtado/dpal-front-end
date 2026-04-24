import fs from 'node:fs/promises';
import path from 'node:path';

export type SourceMode = 'LIVE' | 'IMPORTED' | 'DEMO_FALLBACK';
export type CarbSourceStatus = 'LIVE VERIFIED' | 'CARB PUBLIC DATA' | 'IMPORTED DATASET' | 'DEMO DATA' | 'MISSING' | 'NEEDS REVIEW';

export interface CARBFacilityRecord {
  facilityId: string;
  facilityName: string;
  operatorName: string;
  city: string;
  county: string;
  state: 'California';
  latitude: number | null;
  longitude: number | null;
  sector: string;
  reportingYear: number;
  totalCO2e: number | null;
  methaneCH4: number | null;
  nitrousOxideN2O: number | null;
  carbonDioxideCO2: number | null;
  verificationStatus: string;
  capAndTradeCovered: boolean | null;
  dataSource: string;
  sourceUrl?: string;
  sourceStatus: CarbSourceStatus;
  datasetVersion: string;
  retrievalDate: string;
}

type SearchParams = {
  q?: string;
  facilityId?: string;
  city?: string;
  county?: string;
  sector?: string;
  year?: number;
  limit?: number;
};

const aliasMap: Record<keyof Omit<CARBFacilityRecord, 'state' | 'sourceStatus' | 'datasetVersion' | 'retrievalDate' | 'dataSource'>, string[]> = {
  facilityId: ['facility_id', 'facilityid', 'arb id', 'arb_id', 'arbid'],
  facilityName: ['facility_name', 'facilityname'],
  operatorName: ['operator_name', 'operatorname', 'company_name', 'company'],
  city: ['city'],
  county: ['county'],
  latitude: ['latitude', 'lat'],
  longitude: ['longitude', 'lng', 'lon'],
  sector: ['sector', 'industry'],
  reportingYear: ['reporting_year', 'year'],
  totalCO2e: ['total_co2e', 'emissions_co2e', 'total emissions', 'total_emissions'],
  methaneCH4: ['ch4', 'methane', 'methane_ch4'],
  nitrousOxideN2O: ['n2o', 'nitrous_oxide', 'nitrous_oxide_n2o'],
  carbonDioxideCO2: ['co2', 'carbon_dioxide', 'carbon_dioxide_co2'],
  verificationStatus: ['verification_status', 'verification', 'status'],
  capAndTradeCovered: ['cap_and_trade', 'covered_entity', 'capandtradecovered'],
  sourceUrl: ['source_url', 'sourceurl'],
};

const demoFallback: CARBFacilityRecord[] = [
  {
    facilityId: 'CARB-CA-001',
    facilityName: 'South Coast Refining Complex',
    operatorName: 'Pacific Energy Operations',
    city: 'Long Beach',
    county: 'Los Angeles',
    state: 'California',
    latitude: 33.7701,
    longitude: -118.1937,
    sector: 'Refining',
    reportingYear: 2024,
    totalCO2e: 472100,
    methaneCH4: 19400,
    nitrousOxideN2O: 3310,
    carbonDioxideCO2: 449390,
    verificationStatus: 'Reported',
    capAndTradeCovered: true,
    dataSource: 'DPAL demo fallback',
    sourceUrl: '',
    sourceStatus: 'DEMO DATA',
    datasetVersion: 'demo-v1',
    retrievalDate: new Date().toISOString().slice(0, 10),
  },
  {
    facilityId: 'CARB-CA-001',
    facilityName: 'South Coast Refining Complex',
    operatorName: 'Pacific Energy Operations',
    city: 'Long Beach',
    county: 'Los Angeles',
    state: 'California',
    latitude: 33.7701,
    longitude: -118.1937,
    sector: 'Refining',
    reportingYear: 2025,
    totalCO2e: 450000,
    methaneCH4: 18500,
    nitrousOxideN2O: 3200,
    carbonDioxideCO2: 428300,
    verificationStatus: 'Reported',
    capAndTradeCovered: true,
    dataSource: 'DPAL demo fallback',
    sourceUrl: '',
    sourceStatus: 'DEMO DATA',
    datasetVersion: 'demo-v1',
    retrievalDate: new Date().toISOString().slice(0, 10),
  },
];

let importedRecords: CARBFacilityRecord[] = [];
let importedMeta: { datasetVersion: string; retrievalDate: string } = {
  datasetVersion: 'import-not-loaded',
  retrievalDate: new Date().toISOString().slice(0, 10),
};
let importedBootstrapped = false;

const toNumOrNull = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(String(value).replace(/,/g, '').trim());
  return Number.isFinite(n) ? n : null;
};

const toBoolOrNull = (value: unknown): boolean | null => {
  if (value === null || value === undefined || value === '') return null;
  const text = String(value).trim().toLowerCase();
  if (['true', 'yes', 'y', '1', 'covered'].includes(text)) return true;
  if (['false', 'no', 'n', '0', 'not covered'].includes(text)) return false;
  return null;
};

function normalizeKey(value: string): string {
  return value.toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function getAliasedValue(row: Record<string, unknown>, aliases: string[]): unknown {
  const normalized = Object.entries(row).reduce<Record<string, unknown>>((acc, [k, v]) => {
    acc[normalizeKey(k)] = v;
    return acc;
  }, {});
  for (const alias of aliases) {
    const v = normalized[normalizeKey(alias)];
    if (v !== undefined) return v;
  }
  return undefined;
}

function parseCsvRow(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"' && line[i + 1] === '"') {
      current += '"';
      i += 1;
      continue;
    }
    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (ch === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
      continue;
    }
    current += ch;
  }
  values.push(current.trim());
  return values;
}

function csvToRows(csvText: string): Record<string, unknown>[] {
  const lines = csvText.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = parseCsvRow(lines[0]);
  return lines.slice(1).map((line) => {
    const cols = parseCsvRow(line);
    const out: Record<string, unknown> = {};
    headers.forEach((h, idx) => {
      out[h] = cols[idx] ?? '';
    });
    return out;
  });
}

function normalizeRow(
  row: Record<string, unknown>,
  sourceInfo: { dataSource: string; sourceUrl?: string; datasetVersion: string; retrievalDate: string; baseStatus: CarbSourceStatus },
): CARBFacilityRecord {
  const facilityId = String(getAliasedValue(row, aliasMap.facilityId) ?? '').trim();
  const facilityName = String(getAliasedValue(row, aliasMap.facilityName) ?? '').trim();
  const operatorName = String(getAliasedValue(row, aliasMap.operatorName) ?? '').trim();
  const city = String(getAliasedValue(row, aliasMap.city) ?? '').trim();
  const county = String(getAliasedValue(row, aliasMap.county) ?? '').trim();
  const sector = String(getAliasedValue(row, aliasMap.sector) ?? '').trim();
  const reportingYear = Number(getAliasedValue(row, aliasMap.reportingYear) ?? 0) || new Date().getFullYear();
  const totalCO2e = toNumOrNull(getAliasedValue(row, aliasMap.totalCO2e));
  const methaneCH4 = toNumOrNull(getAliasedValue(row, aliasMap.methaneCH4));
  const nitrousOxideN2O = toNumOrNull(getAliasedValue(row, aliasMap.nitrousOxideN2O));
  const carbonDioxideCO2 = toNumOrNull(getAliasedValue(row, aliasMap.carbonDioxideCO2));
  const latitude = toNumOrNull(getAliasedValue(row, aliasMap.latitude));
  const longitude = toNumOrNull(getAliasedValue(row, aliasMap.longitude));
  const verificationRaw = String(getAliasedValue(row, aliasMap.verificationStatus) ?? '').trim();
  const verificationStatus = verificationRaw || 'NEEDS REVIEW';
  const capAndTradeCovered = toBoolOrNull(getAliasedValue(row, aliasMap.capAndTradeCovered));

  const requiredMissing = !facilityId || !facilityName || totalCO2e == null;
  const status: CarbSourceStatus = requiredMissing ? 'NEEDS REVIEW' : sourceInfo.baseStatus;

  return {
    facilityId: facilityId || `UNKNOWN-${Math.random().toString(36).slice(2, 9)}`,
    facilityName: facilityName || 'Unknown Facility',
    operatorName: operatorName || 'Unknown Operator',
    city: city || 'Unknown',
    county: county || 'Unknown',
    state: 'California',
    latitude,
    longitude,
    sector: sector || 'Unknown',
    reportingYear,
    totalCO2e,
    methaneCH4,
    nitrousOxideN2O,
    carbonDioxideCO2,
    verificationStatus,
    capAndTradeCovered,
    dataSource: sourceInfo.dataSource,
    sourceUrl: sourceInfo.sourceUrl,
    sourceStatus: status,
    datasetVersion: sourceInfo.datasetVersion,
    retrievalDate: sourceInfo.retrievalDate,
  };
}

function applySearch(records: CARBFacilityRecord[], params: SearchParams): CARBFacilityRecord[] {
  const q = (params.q ?? '').toLowerCase().trim();
  const facilityId = (params.facilityId ?? '').toLowerCase().trim();
  const city = (params.city ?? '').toLowerCase().trim();
  const county = (params.county ?? '').toLowerCase().trim();
  const sector = (params.sector ?? '').toLowerCase().trim();
  const year = params.year;
  const limit = Math.min(Math.max(params.limit ?? 50, 1), 500);
  return records
    .filter((r) => {
      if (q && !(r.facilityName.toLowerCase().includes(q) || r.operatorName.toLowerCase().includes(q) || r.facilityId.toLowerCase().includes(q))) return false;
      if (facilityId && !r.facilityId.toLowerCase().includes(facilityId)) return false;
      if (city && !r.city.toLowerCase().includes(city)) return false;
      if (county && !r.county.toLowerCase().includes(county)) return false;
      if (sector && !r.sector.toLowerCase().includes(sector)) return false;
      if (year && r.reportingYear !== year) return false;
      return true;
    })
    .sort((a, b) => b.reportingYear - a.reportingYear)
    .slice(0, limit);
}

async function loadImportedFromDiskIfAny(): Promise<void> {
  if (importedBootstrapped) return;
  importedBootstrapped = true;
  const targetDir = path.resolve(process.cwd(), 'data', 'carb');
  try {
    const files = await fs.readdir(targetDir);
    const loadable = files.filter((f) => f.toLowerCase().endsWith('.json') || f.toLowerCase().endsWith('.csv'));
    if (!loadable.length) return;

    const out: CARBFacilityRecord[] = [];
    for (const file of loadable) {
      const fullPath = path.join(targetDir, file);
      const text = await fs.readFile(fullPath, 'utf8');
      const rows: Record<string, unknown>[] = file.toLowerCase().endsWith('.json')
        ? (Array.isArray(JSON.parse(text)) ? JSON.parse(text) : [])
        : csvToRows(text);
      for (const row of rows) {
        out.push(normalizeRow(row, {
          dataSource: `Imported CARB dataset (${file})`,
          sourceUrl: '',
          datasetVersion: `import-${file}`,
          retrievalDate: new Date().toISOString().slice(0, 10),
          baseStatus: 'IMPORTED DATASET',
        }));
      }
    }
    if (out.length) {
      importedRecords = out;
      importedMeta = { datasetVersion: `import-batch-${Date.now()}`, retrievalDate: new Date().toISOString().slice(0, 10) };
    }
  } catch {
    // No local import folder yet, keep silent.
  }
}

async function fetchLiveDataset(): Promise<{ records: CARBFacilityRecord[]; warnings: string[] }> {
  const liveUrl = process.env.CARB_LIVE_DATA_URL?.trim();
  if (!liveUrl) return { records: [], warnings: ['No live CARB source configured. Set CARB_LIVE_DATA_URL to enable live mode.'] };
  try {
    const response = await fetch(liveUrl);
    if (!response.ok) {
      return { records: [], warnings: [`Live CARB source returned HTTP ${response.status}.`] };
    }
    const contentType = response.headers.get('content-type') ?? '';
    const body = await response.text();
    const rows: Record<string, unknown>[] = contentType.includes('json')
      ? (Array.isArray(JSON.parse(body)) ? JSON.parse(body) : [])
      : csvToRows(body);
    const records = rows.map((row) => normalizeRow(row, {
      dataSource: 'CARB live/public dataset',
      sourceUrl: liveUrl,
      datasetVersion: process.env.CARB_LIVE_DATASET_VERSION || 'live-unknown',
      retrievalDate: new Date().toISOString().slice(0, 10),
      baseStatus: 'CARB PUBLIC DATA',
    }));
    return { records, warnings: [] };
  } catch (error) {
    return { records: [], warnings: [`Live CARB source fetch failed: ${error instanceof Error ? error.message : 'unknown error'}`] };
  }
}

export async function searchCarbFacilityRecords(params: SearchParams): Promise<{ results: CARBFacilityRecord[]; count: number; sourceMode: SourceMode; warnings: string[] }> {
  const warnings: string[] = [];
  const live = await fetchLiveDataset();
  warnings.push(...live.warnings);
  let sourceMode: SourceMode = 'LIVE';
  let selected = live.records;

  if (!selected.length) {
    await loadImportedFromDiskIfAny();
    if (importedRecords.length) {
      sourceMode = 'IMPORTED';
      selected = importedRecords;
    } else {
      sourceMode = 'DEMO_FALLBACK';
      selected = demoFallback.map((row) => ({ ...row, sourceStatus: 'DEMO DATA' }));
      warnings.push('Using demo fallback records because live/imported CARB data is unavailable.');
    }
  }

  const results = applySearch(selected, params);
  return { results, count: results.length, sourceMode, warnings };
}

export async function importCarbDataset(input: { records?: unknown[]; csvText?: string; jsonText?: string; datasetVersion?: string; sourceUrl?: string }): Promise<{ imported: number; warnings: string[] }> {
  const warnings: string[] = [];
  const rows: Record<string, unknown>[] = [];

  if (Array.isArray(input.records)) {
    rows.push(...(input.records as Record<string, unknown>[]));
  }
  if (input.csvText) {
    rows.push(...csvToRows(input.csvText));
  }
  if (input.jsonText) {
    try {
      const parsed = JSON.parse(input.jsonText);
      if (Array.isArray(parsed)) {
        rows.push(...(parsed as Record<string, unknown>[]));
      } else {
        warnings.push('jsonText parsed but was not an array.');
      }
    } catch {
      warnings.push('jsonText could not be parsed.');
    }
  }

  if (!rows.length) {
    warnings.push('No rows provided for import.');
    return { imported: 0, warnings };
  }

  importedRecords = rows.map((row) => normalizeRow(row, {
    dataSource: 'Imported CARB dataset',
    sourceUrl: input.sourceUrl ?? '',
    datasetVersion: input.datasetVersion ?? `manual-import-${Date.now()}`,
    retrievalDate: new Date().toISOString().slice(0, 10),
    baseStatus: 'IMPORTED DATASET',
  }));
  importedMeta = {
    datasetVersion: input.datasetVersion ?? `manual-import-${Date.now()}`,
    retrievalDate: new Date().toISOString().slice(0, 10),
  };
  importedBootstrapped = true;
  return { imported: importedRecords.length, warnings };
}

export function getCarbImportMeta() {
  return importedMeta;
}

