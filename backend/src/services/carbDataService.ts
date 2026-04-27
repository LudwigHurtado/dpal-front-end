import fs from 'node:fs/promises';
import path from 'node:path';

export type SourceMode = 'LIVE' | 'IMPORTED' | 'DEMO_FALLBACK';
export type CarbSourceStatus = 'LIVE VERIFIED' | 'CARB PUBLIC DATA' | 'IMPORTED DATASET' | 'DEMO DATA' | 'MISSING' | 'NEEDS REVIEW';

export interface CARBFacilityRecord {
  facilityId: string;
  arbId: string;
  facilityName: string;
  operatorName: string;
  reportingEntityName: string;
  city: string;
  county: string;
  state: 'California';
  latitude: number | null;
  longitude: number | null;
  sector: string;
  subSector: string;
  reportingYear: number;
  totalCO2e: number | null;
  methaneCH4: number | null;
  nitrousOxideN2O: number | null;
  carbonDioxideCO2: number | null;
  coveredEmissions: number | null;
  verificationStatus: string;
  capAndTradeCovered: boolean | null;
  dataSource: string;
  sourceUrl?: string;
  sourceStatus: CarbSourceStatus;
  datasetVersion: string;
  retrievalDate: string;
  rawRow: Record<string, unknown>;
  normalizedSearchText: string;
}

type SearchParams = {
  q?: string;
  facilityId?: string;
  operatorName?: string;
  facilityName?: string;
  city?: string;
  county?: string;
  sector?: string;
  year?: number;
  limit?: number;
  offset?: number;
};

type ImportValidationSummary = {
  imported: number;
  warnings: string[];
  acceptedRows: number;
  rejectedRows: number;
  missingRequiredFields: string[];
  rejectedDetails: Array<{ rowNumber: number; reason: string }>;
};

type CarbFieldMap =
  | 'facilityId'
  | 'arbId'
  | 'facilityName'
  | 'operatorName'
  | 'reportingEntityName'
  | 'city'
  | 'county'
  | 'latitude'
  | 'longitude'
  | 'sector'
  | 'subSector'
  | 'reportingYear'
  | 'totalCO2e'
  | 'methaneCH4'
  | 'nitrousOxideN2O'
  | 'carbonDioxideCO2'
  | 'coveredEmissions'
  | 'verificationStatus'
  | 'capAndTradeCovered'
  | 'sourceUrl';

const aliasMap: Record<CarbFieldMap, string[]> = {
  facilityId: ['facility_id', 'facilityid', 'arb id', 'arb_id', 'arbid'],
  arbId: ['arb id', 'arb_id', 'arbid', 'facility_id'],
  facilityName: ['facility_name', 'facilityname'],
  operatorName: ['operator_name', 'operatorname', 'company_name', 'company', 'entity_name'],
  reportingEntityName: ['reporting_entity_name', 'entity_name', 'entity', 'reporting entity'],
  city: ['city'],
  county: ['county'],
  latitude: ['latitude', 'lat'],
  longitude: ['longitude', 'lng', 'lon'],
  sector: ['sector', 'industry'],
  subSector: ['sub_sector', 'subsector'],
  reportingYear: ['reporting_year', 'year'],
  totalCO2e: ['total_co2e', 'emissions_co2e', 'total emissions', 'total_emissions'],
  methaneCH4: ['ch4', 'methane', 'methane_ch4'],
  nitrousOxideN2O: ['n2o', 'nitrous_oxide', 'nitrous_oxide_n2o'],
  carbonDioxideCO2: ['co2', 'carbon_dioxide', 'carbon_dioxide_co2'],
  coveredEmissions: ['covered_emissions', 'covered emissions'],
  verificationStatus: ['verification_status', 'verification', 'status'],
  capAndTradeCovered: ['cap_and_trade', 'covered_entity', 'capandtradecovered'],
  sourceUrl: ['source_url', 'sourceurl'],
};

let importedRecords: CARBFacilityRecord[] = [];
let importedMeta: { datasetVersion: string; retrievalDate: string; sourceUrl: string; lastImportAt: string | null } = {
  datasetVersion: 'import-not-loaded',
  retrievalDate: new Date().toISOString().slice(0, 10),
  sourceUrl: '',
  lastImportAt: null,
};
let importedBootstrapped = false;
let liveLastStatus: { connected: boolean; warnings: string[]; sourceUrl: string; datasetVersion: string } = {
  connected: false,
  warnings: [],
  sourceUrl: '',
  datasetVersion: 'import-not-loaded',
};

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

function normalizeCounty(value: string): string {
  return value.toLowerCase().replace(/\bcounty\b/g, '').replace(/\s+/g, ' ').trim();
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
  const arbId = String(getAliasedValue(row, aliasMap.arbId) ?? '').trim();
  const facilityName = String(getAliasedValue(row, aliasMap.facilityName) ?? '').trim();
  const operatorName = String(getAliasedValue(row, aliasMap.operatorName) ?? '').trim();
  const reportingEntityName = String(getAliasedValue(row, aliasMap.reportingEntityName) ?? '').trim();
  const city = String(getAliasedValue(row, aliasMap.city) ?? '').trim();
  const county = String(getAliasedValue(row, aliasMap.county) ?? '').trim();
  const sector = String(getAliasedValue(row, aliasMap.sector) ?? '').trim();
  const subSector = String(getAliasedValue(row, aliasMap.subSector) ?? '').trim();
  const reportingYear = Number(getAliasedValue(row, aliasMap.reportingYear) ?? 0) || new Date().getFullYear();
  const totalCO2e = toNumOrNull(getAliasedValue(row, aliasMap.totalCO2e));
  const methaneCH4 = toNumOrNull(getAliasedValue(row, aliasMap.methaneCH4));
  const nitrousOxideN2O = toNumOrNull(getAliasedValue(row, aliasMap.nitrousOxideN2O));
  const carbonDioxideCO2 = toNumOrNull(getAliasedValue(row, aliasMap.carbonDioxideCO2));
  const coveredEmissions = toNumOrNull(getAliasedValue(row, aliasMap.coveredEmissions));
  const latitude = toNumOrNull(getAliasedValue(row, aliasMap.latitude));
  const longitude = toNumOrNull(getAliasedValue(row, aliasMap.longitude));
  const verificationRaw = String(getAliasedValue(row, aliasMap.verificationStatus) ?? '').trim();
  const verificationStatus = verificationRaw || 'NEEDS REVIEW';
  const capAndTradeCovered = toBoolOrNull(getAliasedValue(row, aliasMap.capAndTradeCovered));

  const requiredMissing = !(facilityName || operatorName || reportingEntityName) || totalCO2e == null;
  const status: CarbSourceStatus = requiredMissing ? 'NEEDS REVIEW' : sourceInfo.baseStatus;
  const effectiveFacilityId = facilityId || arbId || '';
  const normalizedSearchText = [
    facilityName,
    operatorName,
    reportingEntityName,
    effectiveFacilityId,
    arbId,
    city,
    normalizeCounty(county),
    sector,
    String(reportingYear),
  ]
    .map((part) => part.toLowerCase().trim())
    .filter(Boolean)
    .join(' ');

  return {
    facilityId: effectiveFacilityId,
    arbId,
    facilityName: facilityName || 'Unknown Facility',
    operatorName: operatorName || 'Unknown Operator',
    reportingEntityName: reportingEntityName || operatorName || facilityName || 'Unknown Entity',
    city: city || 'Unknown',
    county: county || 'Unknown',
    state: 'California',
    latitude,
    longitude,
    sector: sector || 'Unknown',
    subSector,
    reportingYear,
    totalCO2e,
    methaneCH4,
    nitrousOxideN2O,
    carbonDioxideCO2,
    coveredEmissions,
    verificationStatus,
    capAndTradeCovered,
    dataSource: sourceInfo.dataSource,
    sourceUrl: sourceInfo.sourceUrl,
    sourceStatus: status,
    datasetVersion: sourceInfo.datasetVersion,
    retrievalDate: sourceInfo.retrievalDate,
    rawRow: row,
    normalizedSearchText,
  };
}

function validateImportRow(row: Record<string, unknown>): { missing: string[] } {
  const missing: string[] = [];
  const facilityId = String(getAliasedValue(row, aliasMap.facilityId) ?? '').trim();
  const arbId = String(getAliasedValue(row, aliasMap.arbId) ?? '').trim();
  const facilityName = String(getAliasedValue(row, aliasMap.facilityName) ?? '').trim();
  const operatorName = String(getAliasedValue(row, aliasMap.operatorName) ?? '').trim();
  const reportingYear = Number(getAliasedValue(row, aliasMap.reportingYear) ?? 0);
  const totalCO2e = toNumOrNull(getAliasedValue(row, aliasMap.totalCO2e));

  if (!(facilityName || operatorName)) missing.push('facilityNameOrOperatorName');
  if (!Number.isFinite(reportingYear) || reportingYear <= 0) missing.push('reportingYear');
  if (totalCO2e == null) missing.push('totalCO2e');
  if (!(facilityId || arbId)) missing.push('identifierPreferred');

  return { missing };
}

function applySearch(records: CARBFacilityRecord[], params: SearchParams): CARBFacilityRecord[] {
  const q = (params.q ?? '').toLowerCase().trim();
  const facilityId = (params.facilityId ?? '').toLowerCase().trim();
  const operatorName = (params.operatorName ?? '').toLowerCase().trim();
  const facilityName = (params.facilityName ?? '').toLowerCase().trim();
  const city = (params.city ?? '').toLowerCase().trim();
  const county = normalizeCounty(params.county ?? '');
  const sector = (params.sector ?? '').toLowerCase().trim();
  const year = params.year;
  const limit = Math.min(Math.max(params.limit ?? 50, 1), 500);
  const offset = Math.max(params.offset ?? 0, 0);
  return records
    .filter((r) => {
      if (q && !r.normalizedSearchText.includes(q)) return false;
      if (facilityId && !(r.facilityId.toLowerCase().includes(facilityId) || r.arbId.toLowerCase().includes(facilityId))) return false;
      if (operatorName && !r.operatorName.toLowerCase().includes(operatorName)) return false;
      if (facilityName && !r.facilityName.toLowerCase().includes(facilityName)) return false;
      if (city && !r.city.toLowerCase().includes(city)) return false;
      if (county && !normalizeCounty(r.county).includes(county)) return false;
      if (sector && !r.sector.toLowerCase().includes(sector)) return false;
      if (year && r.reportingYear !== year) return false;
      return true;
    })
    .sort((a, b) => b.reportingYear - a.reportingYear)
    .slice(offset, offset + limit);
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
      importedMeta = {
        datasetVersion: `import-batch-${Date.now()}`,
        retrievalDate: new Date().toISOString().slice(0, 10),
        sourceUrl: '',
        lastImportAt: new Date().toISOString(),
      };
    }
  } catch {
    // No local import folder yet, keep silent.
  }
}

async function fetchLiveDataset(): Promise<{ records: CARBFacilityRecord[]; warnings: string[] }> {
  const liveUrl = process.env.CARB_LIVE_DATA_URL?.trim();
  if (!liveUrl) {
    liveLastStatus = {
      connected: false,
      warnings: ['No live CARB source configured. Set CARB_LIVE_DATA_URL to enable live mode.'],
      sourceUrl: '',
      datasetVersion: 'import-not-loaded',
    };
    return { records: [], warnings: liveLastStatus.warnings };
  }
  try {
    const response = await fetch(liveUrl);
    if (!response.ok) {
      liveLastStatus = {
        connected: false,
        warnings: [`Live CARB source returned HTTP ${response.status}.`],
        sourceUrl: liveUrl,
        datasetVersion: process.env.CARB_LIVE_DATASET_VERSION || 'live-unknown',
      };
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
    liveLastStatus = {
      connected: true,
      warnings: [],
      sourceUrl: liveUrl,
      datasetVersion: process.env.CARB_LIVE_DATASET_VERSION || 'live-unknown',
    };
    return { records, warnings: [] };
  } catch (error) {
    liveLastStatus = {
      connected: false,
      warnings: [`Live CARB source fetch failed: ${error instanceof Error ? error.message : 'unknown error'}`],
      sourceUrl: liveUrl,
      datasetVersion: process.env.CARB_LIVE_DATASET_VERSION || 'live-unknown',
    };
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
      sourceMode = 'LIVE';
      selected = [];
      warnings.push('No live/imported CARB records are currently loaded.');
    }
  }

  const results = applySearch(selected, params);
  return { results, count: results.length, sourceMode, warnings };
}

export async function importCarbDataset(input: { records?: unknown[]; csvText?: string; jsonText?: string; datasetVersion?: string; sourceUrl?: string; retrievalDate?: string }): Promise<ImportValidationSummary> {
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
    return {
      imported: 0,
      warnings,
      acceptedRows: 0,
      rejectedRows: 0,
      missingRequiredFields: [],
      rejectedDetails: [],
    };
  }

  const datasetVersion = input.datasetVersion ?? `manual-import-${Date.now()}`;
  const retrievalDate = input.retrievalDate ?? new Date().toISOString().slice(0, 10);
  const accepted: CARBFacilityRecord[] = [];
  const missingRequiredFields = new Set<string>();
  const rejectedDetails: Array<{ rowNumber: number; reason: string }> = [];
  let rejectedRows = 0;

  rows.forEach((row, index) => {
    const validation = validateImportRow(row);
    if (validation.missing.length > 0) {
      rejectedRows += 1;
      validation.missing.forEach((field) => missingRequiredFields.add(field));
      warnings.push(`Row ${index + 2} rejected: missing ${validation.missing.join(', ')}.`);
      rejectedDetails.push({
        rowNumber: index + 2,
        reason: `Missing ${validation.missing.join(', ')}`,
      });
      return;
    }
    accepted.push(normalizeRow(row, {
      dataSource: 'Imported CARB dataset',
      sourceUrl: input.sourceUrl ?? '',
      datasetVersion,
      retrievalDate,
      baseStatus: 'IMPORTED DATASET',
    }));
  });

  importedRecords = accepted;
  importedMeta = {
    datasetVersion,
    retrievalDate,
    sourceUrl: input.sourceUrl ?? '',
    lastImportAt: new Date().toISOString(),
  };
  importedBootstrapped = true;
  return {
    imported: importedRecords.length,
    warnings,
    acceptedRows: accepted.length,
    rejectedRows,
    missingRequiredFields: Array.from(missingRequiredFields),
    rejectedDetails,
  };
}

export async function syncOfficialCarbDataset(): Promise<{ imported: number; warnings: string[] }> {
  const url = process.env.CARB_OFFICIAL_DATA_URL?.trim();
  if (!url) {
    return { imported: 0, warnings: ['CARB_OFFICIAL_DATA_URL is not configured.'] };
  }
  try {
    const response = await fetch(url);
    if (!response.ok) {
      return { imported: 0, warnings: [`Official CARB source returned HTTP ${response.status}.`] };
    }
    const contentType = response.headers.get('content-type') ?? '';
    const body = await response.text();
    const importResult = await importCarbDataset({
      csvText: contentType.includes('json') ? undefined : body,
      jsonText: contentType.includes('json') ? body : undefined,
      datasetVersion: process.env.CARB_LIVE_DATASET_VERSION || `official-sync-${Date.now()}`,
      sourceUrl: url,
      retrievalDate: new Date().toISOString().slice(0, 10),
    });
    return {
      imported: importResult.imported,
      warnings: importResult.warnings,
    };
  } catch (error) {
    return {
      imported: 0,
      warnings: [`Failed to sync official CARB dataset: ${error instanceof Error ? error.message : 'unknown error'}`],
    };
  }
}

function collectDistinct(records: CARBFacilityRecord[], mapper: (record: CARBFacilityRecord) => string | number): string[] {
  return Array.from(new Set(records.map(mapper).map((value) => String(value).trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b));
}

export async function getCarbDataStatus(): Promise<{
  ok: true;
  sourceMode: SourceMode;
  datasetLoaded: boolean;
  datasetVersion: string;
  sourceUrl: string;
  retrievalDate: string;
  recordCount: number;
  availableYears: number[];
  availableCounties: string[];
  availableSectors: string[];
  availableOperators: string[];
  lastImportAt: string | null;
  searchReadiness: 'Ready' | 'Limited' | 'Not Ready';
  warnings: string[];
}> {
  const warnings: string[] = [];
  const live = await fetchLiveDataset();
  warnings.push(...live.warnings);
  await loadImportedFromDiskIfAny();

  const liveRecords = live.records;
  const hasLive = liveRecords.length > 0;
  const hasImported = importedRecords.length > 0;
  const sourceMode: SourceMode = hasLive ? 'LIVE' : hasImported ? 'IMPORTED' : 'LIVE';
  const active = hasLive ? liveRecords : hasImported ? importedRecords : [];
  const datasetVersion = hasLive
    ? (liveLastStatus.datasetVersion || 'live-unknown')
    : importedMeta.datasetVersion;
  const sourceUrl = hasLive ? liveLastStatus.sourceUrl : importedMeta.sourceUrl;
  const retrievalDate = active[0]?.retrievalDate || importedMeta.retrievalDate || new Date().toISOString().slice(0, 10);
  const recordCount = active.length;
  const datasetLoaded = recordCount > 0;
  let searchReadiness: 'Ready' | 'Limited' | 'Not Ready' = 'Not Ready';
  if (datasetLoaded) searchReadiness = 'Ready';
  else if (liveLastStatus.connected || importedMeta.datasetVersion !== 'import-not-loaded') searchReadiness = 'Limited';

  if (!datasetLoaded) {
    warnings.push('No searchable CARB records are currently loaded.');
  }

  return {
    ok: true,
    sourceMode,
    datasetLoaded,
    datasetVersion: datasetVersion || 'import-not-loaded',
    sourceUrl: sourceUrl || '',
    retrievalDate,
    recordCount,
    availableYears: Array.from(new Set(active.map((record) => record.reportingYear))).sort((a, b) => a - b),
    availableCounties: collectDistinct(active, (record) => record.county),
    availableSectors: collectDistinct(active, (record) => record.sector),
    availableOperators: collectDistinct(active, (record) => record.operatorName),
    lastImportAt: importedMeta.lastImportAt,
    searchReadiness,
    warnings: Array.from(new Set(warnings.filter(Boolean))),
  };
}

export function getCarbImportMeta() {
  return importedMeta;
}

