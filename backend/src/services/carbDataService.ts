import fs from 'node:fs/promises';
import path from 'node:path';
import XLSX from 'xlsx';

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

type DatasetQuality = {
  acceptedRows: number;
  rejectedRows: number;
  unknownFacilityCount: number;
  unknownOperatorCount: number;
  nullEmissionsCount: number;
  availableFieldCoverage: {
    facilityName: number;
    operatorName: number;
    county: number;
    sector: number;
    reportingYear: number;
    totalCO2e: number;
  };
};

type ImportValidationSummary = {
  imported: number;
  warnings: string[];
  acceptedRows: number;
  rejectedRows: number;
  missingRequiredFields: string[];
  rejectedDetails: Array<{ rowNumber: number; reason: string }>;
};

type DatasetSnapshot = {
  records: CARBFacilityRecord[];
  sourceMode: SourceMode;
  datasetVersion: string;
  retrievalDate: string;
  sourceUrl: string;
  warnings: string[];
  quality: DatasetQuality;
  lastImportAt: string | null;
};

type CarbSmokeResult = {
  ok: boolean;
  statusReady: boolean;
  hasQualityCoverage: boolean;
  emptySearchHasRealRows: boolean;
  noBinaryGarbageRows: boolean;
  shellSearchCount: number;
  refinerySearchCount: number;
  year2024SearchCount: number;
  failures: string[];
  warnings: string[];
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
  facilityId: ['facility id', 'facility identifier', 'facility_id', 'facilityid', 'id', 'entity id', 'reporting entity id'],
  arbId: ['arb id', 'arb_id', 'arbid', 'facility id', 'entity id'],
  facilityName: ['facility name', 'facility', 'facility/entity name', 'entity name'],
  operatorName: ['operator name', 'operator', 'company name', 'reporting entity name', 'entity name'],
  reportingEntityName: ['reporting entity name', 'reporting entity', 'entity name', 'entity'],
  city: ['city', 'facility city'],
  county: ['county', 'facility county'],
  latitude: ['latitude', 'lat'],
  longitude: ['longitude', 'lng', 'lon'],
  sector: ['sector', 'industry sector', 'naics sector', 'industry'],
  subSector: ['subsector', 'sub-sector', 'sub sector'],
  reportingYear: ['reporting year', 'report year', 'calendar year', 'year'],
  totalCO2e: ['total co2e', 'total emissions', 'total ghg emissions', 'co2e', 'mtco2e', 'metric tons co2e', 'total covered emissions'],
  methaneCH4: ['ch4', 'methane', 'methane ch4'],
  nitrousOxideN2O: ['n2o', 'nitrous oxide', 'nitrous oxide n2o'],
  carbonDioxideCO2: ['co2', 'carbon dioxide', 'carbon dioxide co2'],
  coveredEmissions: ['covered emissions', 'covered emissions co2e', 'cap-and-trade covered emissions'],
  verificationStatus: ['verification status', 'verification', 'verified'],
  capAndTradeCovered: ['cap-and-trade', 'cap and trade', 'covered entity', 'cap_and_trade'],
  sourceUrl: ['source url', 'source_url'],
};

const UNKNOWN_VALUES = new Set(['', 'unknown', 'unknown facility', 'unknown operator', 'unknown entity', 'n/a', 'na', 'null', 'none']);
const XLSX_HEADER_SIGNATURE = Buffer.from([0x50, 0x4b, 0x03, 0x04]);

let importedSnapshot: DatasetSnapshot = {
  records: [],
  sourceMode: 'IMPORTED',
  datasetVersion: 'import-not-loaded',
  retrievalDate: new Date().toISOString().slice(0, 10),
  sourceUrl: '',
  warnings: [],
  quality: {
    acceptedRows: 0,
    rejectedRows: 0,
    unknownFacilityCount: 0,
    unknownOperatorCount: 0,
    nullEmissionsCount: 0,
    availableFieldCoverage: {
      facilityName: 0,
      operatorName: 0,
      county: 0,
      sector: 0,
      reportingYear: 0,
      totalCO2e: 0,
    },
  },
  lastImportAt: null,
};

let importedBootstrapped = false;
let liveSnapshot: DatasetSnapshot = {
  records: [],
  sourceMode: 'LIVE',
  datasetVersion: 'import-not-loaded',
  retrievalDate: new Date().toISOString().slice(0, 10),
  sourceUrl: '',
  warnings: ['No official CARB source configured.'],
  quality: {
    acceptedRows: 0,
    rejectedRows: 0,
    unknownFacilityCount: 0,
    unknownOperatorCount: 0,
    nullEmissionsCount: 0,
    availableFieldCoverage: {
      facilityName: 0,
      operatorName: 0,
      county: 0,
      sector: 0,
      reportingYear: 0,
      totalCO2e: 0,
    },
  },
  lastImportAt: null,
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

function isUnknown(value: unknown): boolean {
  return UNKNOWN_VALUES.has(String(value ?? '').trim().toLowerCase());
}

function normalizeKey(value: string): string {
  return value.toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function normalizeCounty(value: string): string {
  return value.toLowerCase().replace(/\bcounty\b/g, '').replace(/\s+/g, ' ').trim();
}

function buildNormalizedLookup(row: Record<string, unknown>): Record<string, unknown> {
  return Object.entries(row).reduce<Record<string, unknown>>((acc, [key, val]) => {
    acc[normalizeKey(key)] = val;
    return acc;
  }, {});
}

function getAliasedValueFromLookup(lookup: Record<string, unknown>, aliases: string[]): unknown {
  for (const alias of aliases) {
    const normalizedAlias = normalizeKey(alias);
    const direct = lookup[normalizedAlias];
    if (direct !== undefined) return direct;
    const fuzzyMatch = Object.entries(lookup).find(([key]) => key.includes(normalizedAlias) || normalizedAlias.includes(key));
    if (fuzzyMatch && fuzzyMatch[1] !== undefined) return fuzzyMatch[1];
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

function scoreHeaderRow(headers: string[]): number {
  const normalized = headers.map((header) => normalizeKey(header));
  if (normalized.length < 6) return 0;
  const hasNameColumn = normalized.some((header) => header.includes('facility') || header.includes('entity') || header.includes('operator'));
  const hasYearColumn = normalized.some((header) => header.includes('report year') || header.includes('reporting year') || header === 'year');
  const hasEmissionsColumn = normalized.some((header) => header.includes('total') && header.includes('co2e'));
  if (!hasNameColumn || !hasYearColumn || !hasEmissionsColumn) return 0;
  const includeTokens = [
    'arb id', 'facility', 'entity', 'operator', 'report year', 'reporting year', 'total', 'co2e', 'city', 'county', 'sector',
  ];
  let score = 0;
  for (const token of includeTokens) {
    if (normalized.some((header) => header.includes(token))) {
      score += 1;
    }
  }
  return score;
}

function rowsFromWorksheet(worksheet: XLSX.WorkSheet): { rows: Record<string, unknown>[]; headerScore: number } {
  const matrix = XLSX.utils.sheet_to_json<(string | number | null)[]>(worksheet, {
    header: 1,
    raw: false,
    blankrows: false,
    defval: '',
  });
  if (!matrix.length) return { rows: [], headerScore: 0 };
  let bestIndex = -1;
  let bestScore = -1;
  const maxInspect = Math.min(25, matrix.length);
  for (let i = 0; i < maxInspect; i += 1) {
    const row = matrix[i];
    if (!Array.isArray(row)) continue;
    const asStrings = row.map((cell) => String(cell ?? '').trim()).filter(Boolean);
    if (asStrings.length < 3) continue;
    const score = scoreHeaderRow(asStrings);
    if (score > bestScore) {
      bestScore = score;
      bestIndex = i;
    }
  }
  if (bestIndex < 0 || bestScore < 3) return { rows: [], headerScore: bestScore };
  const headerRow = matrix[bestIndex].map((cell) => String(cell ?? '').trim());
  const rows: Record<string, unknown>[] = [];
  for (let i = bestIndex + 1; i < matrix.length; i += 1) {
    const row = matrix[i];
    const asStrings = row.map((cell) => String(cell ?? '').trim());
    if (asStrings.every((value) => !value)) continue;
    const out: Record<string, unknown> = {};
    headerRow.forEach((header, idx) => {
      if (!header) return;
      out[header] = asStrings[idx] ?? '';
    });
    if (Object.keys(out).length) rows.push(out);
  }
  return { rows, headerScore: bestScore };
}

function parseXlsxBuffer(buffer: Buffer): Record<string, unknown>[] {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  let bestRows: Record<string, unknown>[] = [];
  let bestWeight = 0;
  for (const sheetName of workbook.SheetNames) {
    const candidate = rowsFromWorksheet(workbook.Sheets[sheetName]);
    const weight = candidate.headerScore * Math.max(candidate.rows.length, 1);
    if (weight > bestWeight) {
      bestWeight = weight;
      bestRows = candidate.rows;
    }
  }
  return bestRows;
}

function parseRowsFromBuffer(buffer: Buffer, sourceHint: string, contentType = ''): Record<string, unknown>[] {
  const looksLikeXlsx = sourceHint.toLowerCase().endsWith('.xlsx')
    || contentType.toLowerCase().includes('spreadsheet')
    || contentType.toLowerCase().includes('excel')
    || contentType.toLowerCase().includes('openxml')
    || buffer.subarray(0, 4).equals(XLSX_HEADER_SIGNATURE);
  if (looksLikeXlsx) {
    return parseXlsxBuffer(buffer);
  }
  const text = buffer.toString('utf8');
  if (contentType.toLowerCase().includes('json') || sourceHint.toLowerCase().endsWith('.json')) {
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : [];
  }
  return csvToRows(text);
}

function normalizeRow(
  row: Record<string, unknown>,
  sourceInfo: { dataSource: string; sourceUrl?: string; datasetVersion: string; retrievalDate: string; baseStatus: CarbSourceStatus },
): CARBFacilityRecord {
  const lookup = buildNormalizedLookup(row);
  const facilityId = String(getAliasedValueFromLookup(lookup, aliasMap.facilityId) ?? '').trim();
  const arbId = String(getAliasedValueFromLookup(lookup, aliasMap.arbId) ?? '').trim();
  const facilityName = String(getAliasedValueFromLookup(lookup, aliasMap.facilityName) ?? '').trim();
  const operatorName = String(getAliasedValueFromLookup(lookup, aliasMap.operatorName) ?? '').trim();
  const reportingEntityName = String(getAliasedValueFromLookup(lookup, aliasMap.reportingEntityName) ?? '').trim();
  const city = String(getAliasedValueFromLookup(lookup, aliasMap.city) ?? '').trim();
  const county = String(getAliasedValueFromLookup(lookup, aliasMap.county) ?? '').trim();
  const sector = String(getAliasedValueFromLookup(lookup, aliasMap.sector) ?? '').trim();
  const subSector = String(getAliasedValueFromLookup(lookup, aliasMap.subSector) ?? '').trim();
  const reportingYear = Number(getAliasedValueFromLookup(lookup, aliasMap.reportingYear) ?? 0);
  const totalCO2e = toNumOrNull(getAliasedValueFromLookup(lookup, aliasMap.totalCO2e));
  const methaneCH4 = toNumOrNull(getAliasedValueFromLookup(lookup, aliasMap.methaneCH4));
  const nitrousOxideN2O = toNumOrNull(getAliasedValueFromLookup(lookup, aliasMap.nitrousOxideN2O));
  const carbonDioxideCO2 = toNumOrNull(getAliasedValueFromLookup(lookup, aliasMap.carbonDioxideCO2));
  const coveredEmissions = toNumOrNull(getAliasedValueFromLookup(lookup, aliasMap.coveredEmissions));
  const latitude = toNumOrNull(getAliasedValueFromLookup(lookup, aliasMap.latitude));
  const longitude = toNumOrNull(getAliasedValueFromLookup(lookup, aliasMap.longitude));
  const verificationRaw = String(getAliasedValueFromLookup(lookup, aliasMap.verificationStatus) ?? '').trim();
  const verificationStatus = verificationRaw || 'NEEDS REVIEW';
  const capAndTradeCovered = toBoolOrNull(getAliasedValueFromLookup(lookup, aliasMap.capAndTradeCovered));

  const effectiveFacilityId = facilityId || arbId;
  const normalizedSearchText = [
    facilityName,
    operatorName,
    reportingEntityName,
    effectiveFacilityId,
    arbId,
    city,
    normalizeCounty(county),
    sector,
    Number.isFinite(reportingYear) ? String(reportingYear) : '',
  ]
    .map((part) => String(part).toLowerCase().trim())
    .filter(Boolean)
    .join(' ');

  return {
    facilityId: effectiveFacilityId,
    arbId,
    facilityName: facilityName || '',
    operatorName: operatorName || '',
    reportingEntityName: reportingEntityName || '',
    city: city || '',
    county: county || '',
    state: 'California',
    latitude,
    longitude,
    sector: sector || '',
    subSector,
    reportingYear: Number.isFinite(reportingYear) ? reportingYear : 0,
    totalCO2e,
    methaneCH4,
    nitrousOxideN2O,
    carbonDioxideCO2,
    coveredEmissions,
    verificationStatus,
    capAndTradeCovered,
    dataSource: sourceInfo.dataSource,
    sourceUrl: sourceInfo.sourceUrl,
    sourceStatus: sourceInfo.baseStatus,
    datasetVersion: sourceInfo.datasetVersion,
    retrievalDate: sourceInfo.retrievalDate,
    rawRow: row,
    normalizedSearchText,
  };
}

function validateNormalizedRecord(record: CARBFacilityRecord): { ok: boolean; reason?: string } {
  const hasName = !isUnknown(record.facilityName) || !isUnknown(record.operatorName) || !isUnknown(record.reportingEntityName);
  if (!hasName) return { ok: false, reason: 'Missing usable facility/operator/entity name' };
  if (!Number.isFinite(record.reportingYear) || record.reportingYear < 1990 || record.reportingYear > 2100) {
    return { ok: false, reason: 'Missing or invalid reportingYear' };
  }
  if (record.totalCO2e == null) return { ok: false, reason: 'Missing totalCO2e' };
  if (!record.normalizedSearchText || /^\d{4}$/.test(record.normalizedSearchText)) {
    return { ok: false, reason: 'No meaningful searchable identity' };
  }
  const rawSerialized = JSON.stringify(record.rawRow);
  if (rawSerialized.includes('PK\u0003\u0004')) {
    return { ok: false, reason: 'Row appears to contain binary XLSX payload, not parsed tabular data' };
  }
  return { ok: true };
}

function hasBinaryGarbageRow(record: CARBFacilityRecord): boolean {
  const rawSerialized = JSON.stringify(record.rawRow);
  return rawSerialized.includes('PK\u0003\u0004')
    || rawSerialized.includes('"PK\\u0003\\u0004')
    || rawSerialized.includes('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
}

function isClearlyMalformedRecord(record: CARBFacilityRecord): boolean {
  if (hasBinaryGarbageRow(record)) return true;
  const unknownIdentity = isUnknown(record.facilityName) && isUnknown(record.operatorName) && isUnknown(record.reportingEntityName);
  if (unknownIdentity && record.totalCO2e == null) return true;
  if (!record.normalizedSearchText || /^\d{4}$/.test(record.normalizedSearchText)) return true;
  return false;
}

function computeQuality(records: CARBFacilityRecord[], rejectedRows: number): DatasetQuality {
  const total = records.length || 1;
  const withFacility = records.filter((record) => !isUnknown(record.facilityName)).length;
  const withOperator = records.filter((record) => !isUnknown(record.operatorName)).length;
  const withCounty = records.filter((record) => !isUnknown(record.county)).length;
  const withSector = records.filter((record) => !isUnknown(record.sector)).length;
  const withYear = records.filter((record) => Number.isFinite(record.reportingYear) && record.reportingYear > 0).length;
  const withEmissions = records.filter((record) => record.totalCO2e != null).length;

  return {
    acceptedRows: records.length,
    rejectedRows,
    unknownFacilityCount: records.filter((record) => isUnknown(record.facilityName)).length,
    unknownOperatorCount: records.filter((record) => isUnknown(record.operatorName)).length,
    nullEmissionsCount: records.filter((record) => record.totalCO2e == null).length,
    availableFieldCoverage: {
      facilityName: Math.round((withFacility / total) * 100),
      operatorName: Math.round((withOperator / total) * 100),
      county: Math.round((withCounty / total) * 100),
      sector: Math.round((withSector / total) * 100),
      reportingYear: Math.round((withYear / total) * 100),
      totalCO2e: Math.round((withEmissions / total) * 100),
    },
  };
}

function buildSnapshot(params: {
  records: CARBFacilityRecord[];
  sourceMode: SourceMode;
  datasetVersion: string;
  retrievalDate: string;
  sourceUrl: string;
  warnings: string[];
  rejectedRows: number;
  lastImportAt: string | null;
}): DatasetSnapshot {
  return {
    records: params.records,
    sourceMode: params.sourceMode,
    datasetVersion: params.datasetVersion,
    retrievalDate: params.retrievalDate,
    sourceUrl: params.sourceUrl,
    warnings: Array.from(new Set(params.warnings.filter(Boolean))),
    quality: computeQuality(params.records, params.rejectedRows),
    lastImportAt: params.lastImportAt,
  };
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
    .filter((record) => {
      if (q && !record.normalizedSearchText.includes(q)) return false;
      if (facilityId && !(record.facilityId.toLowerCase().includes(facilityId) || record.arbId.toLowerCase().includes(facilityId))) return false;
      if (operatorName && !record.operatorName.toLowerCase().includes(operatorName)) return false;
      if (facilityName && !record.facilityName.toLowerCase().includes(facilityName)) return false;
      if (city && !record.city.toLowerCase().includes(city)) return false;
      if (county && !normalizeCounty(record.county).includes(county)) return false;
      if (sector && !record.sector.toLowerCase().includes(sector)) return false;
      if (year && record.reportingYear !== year) return false;
      return true;
    })
    .sort((a, b) => b.reportingYear - a.reportingYear)
    .slice(offset, offset + limit);
}

function extractAndValidateRows(rows: Record<string, unknown>[], sourceInfo: {
  sourceMode: SourceMode;
  dataSource: string;
  sourceUrl: string;
  datasetVersion: string;
  retrievalDate: string;
  baseStatus: CarbSourceStatus;
  lastImportAt: string | null;
}): { snapshot: DatasetSnapshot; rejectedDetails: Array<{ rowNumber: number; reason: string }> } {
  const accepted: CARBFacilityRecord[] = [];
  const rejectedDetails: Array<{ rowNumber: number; reason: string }> = [];
  rows.forEach((row, index) => {
    const normalized = normalizeRow(row, {
      dataSource: sourceInfo.dataSource,
      sourceUrl: sourceInfo.sourceUrl,
      datasetVersion: sourceInfo.datasetVersion,
      retrievalDate: sourceInfo.retrievalDate,
      baseStatus: sourceInfo.baseStatus,
    });
    const verdict = validateNormalizedRecord(normalized);
    if (!verdict.ok) {
      rejectedDetails.push({
        rowNumber: index + 2,
        reason: verdict.reason ?? 'Unknown validation failure',
      });
      return;
    }
    accepted.push(normalized);
  });

  const warnings: string[] = [];
  if (accepted.length > 0) {
    const quality = computeQuality(accepted, rejectedDetails.length);
    if (quality.unknownOperatorCount > 0 || quality.availableFieldCoverage.county < 100 || quality.availableFieldCoverage.sector < 100) {
      warnings.push('CARB dataset loaded, but some rows are missing county/sector/operator fields.');
    }
  } else {
    warnings.push('Official CARB source was reached but could not be parsed as a valid CARB dataset.');
  }

  return {
    snapshot: buildSnapshot({
      records: accepted,
      sourceMode: sourceInfo.sourceMode,
      datasetVersion: sourceInfo.datasetVersion,
      retrievalDate: sourceInfo.retrievalDate,
      sourceUrl: sourceInfo.sourceUrl,
      warnings,
      rejectedRows: rejectedDetails.length,
      lastImportAt: sourceInfo.lastImportAt,
    }),
    rejectedDetails,
  };
}

async function loadImportedFromDiskIfAny(): Promise<void> {
  if (importedBootstrapped) return;
  importedBootstrapped = true;
  const targetDir = path.resolve(process.cwd(), 'data', 'carb');
  try {
    const files = await fs.readdir(targetDir);
    const loadable = files.filter((file) => {
      const lower = file.toLowerCase();
      return lower.endsWith('.json') || lower.endsWith('.csv') || lower.endsWith('.xlsx');
    });
    if (!loadable.length) return;
    const records: CARBFacilityRecord[] = [];
    let rejectedRows = 0;
    const warnings: string[] = [];
    for (const file of loadable) {
      const fullPath = path.join(targetDir, file);
      const buffer = await fs.readFile(fullPath);
      const rows = parseRowsFromBuffer(buffer, file);
      const extracted = extractAndValidateRows(rows, {
        sourceMode: 'IMPORTED',
        dataSource: `Imported CARB dataset (${file})`,
        sourceUrl: '',
        datasetVersion: `import-${file}`,
        retrievalDate: new Date().toISOString().slice(0, 10),
        baseStatus: 'IMPORTED DATASET',
        lastImportAt: new Date().toISOString(),
      });
      records.push(...extracted.snapshot.records);
      rejectedRows += extracted.rejectedDetails.length;
      warnings.push(...extracted.snapshot.warnings);
    }
    const malformedCount = records.filter(isClearlyMalformedRecord).length;
    const acceptedAfterMalformedFilter = records.filter((record) => !isClearlyMalformedRecord(record));
    if (malformedCount > 0) {
      warnings.push('Cached CARB import was rejected because it contains malformed XLSX/binary rows.');
    }
    importedSnapshot = buildSnapshot({
      records: acceptedAfterMalformedFilter,
      sourceMode: 'IMPORTED',
      datasetVersion: acceptedAfterMalformedFilter.length ? `import-batch-${Date.now()}` : 'import-not-loaded',
      retrievalDate: new Date().toISOString().slice(0, 10),
      sourceUrl: '',
      warnings,
      rejectedRows: rejectedRows + malformedCount,
      lastImportAt: acceptedAfterMalformedFilter.length ? new Date().toISOString() : null,
    });
    if (!acceptedAfterMalformedFilter.length && malformedCount > 0) {
      importedSnapshot = {
        ...importedSnapshot,
        warnings: Array.from(new Set([...importedSnapshot.warnings, 'Cached CARB import was rejected because it contains malformed XLSX/binary rows.'])),
      };
    }
  } catch {
    // no-op
  }
}

async function fetchLiveDataset(): Promise<DatasetSnapshot> {
  const liveUrl = process.env.CARB_LIVE_DATA_URL?.trim();
  const datasetVersion = process.env.CARB_LIVE_DATASET_VERSION?.trim() || 'live-unknown';
  const retrievalDate = new Date().toISOString().slice(0, 10);
  if (!liveUrl) {
    liveSnapshot = buildSnapshot({
      records: [],
      sourceMode: 'LIVE',
      datasetVersion: 'import-not-loaded',
      retrievalDate,
      sourceUrl: '',
      warnings: ['No official CARB source configured.'],
      rejectedRows: 0,
      lastImportAt: null,
    });
    return liveSnapshot;
  }

  try {
    const response = await fetch(liveUrl);
    if (!response.ok) {
      liveSnapshot = buildSnapshot({
        records: [],
        sourceMode: 'LIVE',
        datasetVersion,
        retrievalDate,
        sourceUrl: liveUrl,
        warnings: [`Live CARB source returned HTTP ${response.status}.`],
        rejectedRows: 0,
        lastImportAt: null,
      });
      return liveSnapshot;
    }
    const contentType = response.headers.get('content-type') ?? '';
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    let rows: Record<string, unknown>[] = [];
    try {
      rows = parseRowsFromBuffer(buffer, liveUrl, contentType);
    } catch (error) {
      liveSnapshot = buildSnapshot({
        records: [],
        sourceMode: 'LIVE',
        datasetVersion,
        retrievalDate,
        sourceUrl: liveUrl,
        warnings: [`CARB XLSX parser failed. Verify spreadsheet format or use CSV/JSON import. ${error instanceof Error ? error.message : ''}`.trim()],
        rejectedRows: 0,
        lastImportAt: null,
      });
      return liveSnapshot;
    }
    const extracted = extractAndValidateRows(rows, {
      sourceMode: 'LIVE',
      dataSource: 'CARB live/public dataset',
      sourceUrl: liveUrl,
      datasetVersion,
      retrievalDate,
      baseStatus: 'CARB PUBLIC DATA',
      lastImportAt: new Date().toISOString(),
    });
    liveSnapshot = extracted.snapshot;
    if (!liveSnapshot.records.length && !liveSnapshot.warnings.some((warning) => warning.includes('could not be parsed'))) {
      liveSnapshot.warnings.push('Official CARB source was reached but could not be parsed as a valid CARB dataset.');
    }
    return liveSnapshot;
  } catch (error) {
    liveSnapshot = buildSnapshot({
      records: [],
      sourceMode: 'LIVE',
      datasetVersion,
      retrievalDate,
      sourceUrl: liveUrl,
      warnings: [`Live CARB source fetch failed: ${error instanceof Error ? error.message : 'unknown error'}`],
      rejectedRows: 0,
      lastImportAt: null,
    });
    return liveSnapshot;
  }
}

async function resolveActiveDataset(): Promise<DatasetSnapshot> {
  const live = await fetchLiveDataset();
  if (live.sourceUrl) return live;
  await loadImportedFromDiskIfAny();
  if (importedSnapshot.records.length) return importedSnapshot;
  const mergedWarnings = Array.from(new Set([...live.warnings, ...importedSnapshot.warnings, 'No live/imported CARB records are currently loaded.']));
  return buildSnapshot({
    records: [],
    sourceMode: live.sourceMode,
    datasetVersion: live.datasetVersion || importedSnapshot.datasetVersion || 'import-not-loaded',
    retrievalDate: live.retrievalDate || importedSnapshot.retrievalDate || new Date().toISOString().slice(0, 10),
    sourceUrl: live.sourceUrl || importedSnapshot.sourceUrl || '',
    warnings: mergedWarnings,
    rejectedRows: live.quality.rejectedRows + importedSnapshot.quality.rejectedRows,
    lastImportAt: importedSnapshot.lastImportAt,
  });
}

export async function searchCarbFacilityRecords(params: SearchParams): Promise<{
  results: CARBFacilityRecord[];
  count: number;
  sourceMode: SourceMode;
  datasetVersion: string;
  retrievalDate: string;
  sourceUrl: string;
  warnings: string[];
  quality: DatasetQuality;
}> {
  const active = await resolveActiveDataset();
  const cleanRecords = active.records.filter((record) => !isClearlyMalformedRecord(record));
  const results = applySearch(cleanRecords, params);
  return {
    results,
    count: results.length,
    sourceMode: active.sourceMode,
    datasetVersion: active.datasetVersion,
    retrievalDate: active.retrievalDate,
    sourceUrl: active.sourceUrl,
    warnings: active.warnings,
    quality: active.quality,
  };
}

export async function importCarbDataset(input: {
  records?: unknown[];
  csvText?: string;
  jsonText?: string;
  datasetVersion?: string;
  sourceUrl?: string;
  retrievalDate?: string;
}): Promise<ImportValidationSummary> {
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
      if (Array.isArray(parsed)) rows.push(...(parsed as Record<string, unknown>[]));
      else warnings.push('jsonText parsed but was not an array.');
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
  const extracted = extractAndValidateRows(rows, {
    sourceMode: 'IMPORTED',
    dataSource: 'Imported CARB dataset',
    sourceUrl: input.sourceUrl ?? '',
    datasetVersion,
    retrievalDate,
    baseStatus: 'IMPORTED DATASET',
    lastImportAt: new Date().toISOString(),
  });
  importedSnapshot = buildSnapshot({
    records: extracted.snapshot.records,
    sourceMode: 'IMPORTED',
    datasetVersion,
    retrievalDate,
    sourceUrl: input.sourceUrl ?? '',
    warnings: extracted.snapshot.warnings,
    rejectedRows: extracted.rejectedDetails.length,
    lastImportAt: new Date().toISOString(),
  });
  importedBootstrapped = true;

  const missingFieldSet = new Set<string>();
  extracted.rejectedDetails.forEach((detail) => {
    if (detail.reason.toLowerCase().includes('name')) missingFieldSet.add('facilityNameOrOperatorName');
    if (detail.reason.toLowerCase().includes('reportingyear')) missingFieldSet.add('reportingYear');
    if (detail.reason.toLowerCase().includes('totalco2e')) missingFieldSet.add('totalCO2e');
  });
  return {
    imported: importedSnapshot.records.length,
    warnings: [...warnings, ...importedSnapshot.warnings],
    acceptedRows: importedSnapshot.records.length,
    rejectedRows: extracted.rejectedDetails.length,
    missingRequiredFields: Array.from(missingFieldSet),
    rejectedDetails: extracted.rejectedDetails,
  };
}

export async function syncOfficialCarbDataset(): Promise<{ imported: number; warnings: string[]; datasetVersion: string; recordCount: number }> {
  const url = process.env.CARB_OFFICIAL_DATA_URL?.trim();
  if (!url) {
    return { imported: 0, warnings: ['Official sync cannot run until CARB_OFFICIAL_DATA_URL is configured.'], datasetVersion: 'import-not-loaded', recordCount: 0 };
  }
  try {
    const response = await fetch(url);
    if (!response.ok) {
      return { imported: 0, warnings: [`Official CARB source returned HTTP ${response.status}.`], datasetVersion: 'import-not-loaded', recordCount: 0 };
    }
    const contentType = response.headers.get('content-type') ?? '';
    const buffer = Buffer.from(await response.arrayBuffer());
    const rows = parseRowsFromBuffer(buffer, url, contentType);
    const datasetVersion = process.env.CARB_LIVE_DATASET_VERSION || `official-sync-${Date.now()}`;
    const retrievalDate = new Date().toISOString().slice(0, 10);
    const extracted = extractAndValidateRows(rows, {
      sourceMode: 'IMPORTED',
      dataSource: 'Imported CARB dataset',
      sourceUrl: url,
      datasetVersion,
      retrievalDate,
      baseStatus: 'IMPORTED DATASET',
      lastImportAt: new Date().toISOString(),
    });
    importedSnapshot = buildSnapshot({
      records: extracted.snapshot.records,
      sourceMode: 'IMPORTED',
      datasetVersion,
      retrievalDate,
      sourceUrl: url,
      warnings: extracted.snapshot.warnings,
      rejectedRows: extracted.rejectedDetails.length,
      lastImportAt: new Date().toISOString(),
    });
    importedBootstrapped = true;
    return {
      imported: importedSnapshot.records.length,
      warnings: importedSnapshot.warnings,
      datasetVersion: importedSnapshot.datasetVersion,
      recordCount: importedSnapshot.records.length,
    };
  } catch (error) {
    return {
      imported: 0,
      warnings: [`CARB XLSX parser failed. Verify spreadsheet format or use CSV/JSON import. ${error instanceof Error ? error.message : ''}`.trim()],
      datasetVersion: 'import-not-loaded',
      recordCount: 0,
    };
  }
}

function collectDistinct(records: CARBFacilityRecord[], mapper: (record: CARBFacilityRecord) => string | number): string[] {
  return Array.from(
    new Set(
      records
        .map(mapper)
        .map((value) => String(value).trim())
        .filter((value) => value && !isUnknown(value)),
    ),
  ).sort((a, b) => a.localeCompare(b));
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
  quality: DatasetQuality;
}> {
  const active = await resolveActiveDataset();
  const cleanRecords = active.records.filter((record) => !isClearlyMalformedRecord(record));
  const availableYears = Array.from(new Set(cleanRecords.map((record) => record.reportingYear))).filter((year) => Number.isFinite(year)).sort((a, b) => a - b);
  const availableCounties = collectDistinct(cleanRecords, (record) => record.county);
  const availableSectors = collectDistinct(cleanRecords, (record) => record.sector);
  const availableOperators = collectDistinct(cleanRecords, (record) => record.operatorName);
  const datasetLoaded = cleanRecords.length > 0
    && availableYears.length > 0
    && (availableCounties.length > 0 || availableSectors.length > 0 || availableOperators.length > 0);
  let searchReadiness: 'Ready' | 'Limited' | 'Not Ready' = 'Not Ready';
  if (datasetLoaded) {
    searchReadiness = 'Ready';
  } else if (active.sourceUrl || active.datasetVersion !== 'import-not-loaded') {
    searchReadiness = 'Limited';
  }
  const warnings = [...active.warnings];
  if (!datasetLoaded) {
    warnings.push('Official CARB source was reached but could not be parsed as a valid CARB dataset.');
  }
  if (active.records.length > cleanRecords.length) {
    warnings.push('Cached CARB import was rejected because it contains malformed XLSX/binary rows.');
  }
  return {
    ok: true,
    sourceMode: active.sourceMode,
    datasetLoaded,
    datasetVersion: active.datasetVersion || 'import-not-loaded',
    sourceUrl: active.sourceUrl || '',
    retrievalDate: active.retrievalDate,
    recordCount: datasetLoaded ? cleanRecords.length : 0,
    availableYears,
    availableCounties,
    availableSectors,
    availableOperators,
    lastImportAt: active.lastImportAt,
    searchReadiness,
    warnings: Array.from(new Set(warnings.filter(Boolean))),
    quality: active.quality,
  };
}

export async function getCarbDataSmokeCheck(): Promise<CarbSmokeResult> {
  const failures: string[] = [];
  const warnings: string[] = [];
  const status = await getCarbDataStatus();
  const empty = await searchCarbFacilityRecords({ limit: 5 });
  const shell = await searchCarbFacilityRecords({ q: 'Shell', limit: 10 });
  const refinery = await searchCarbFacilityRecords({ sector: 'Refinery', limit: 10 });
  const year2024 = await searchCarbFacilityRecords({ year: 2024, limit: 10 });

  const hasQualityCoverage = Boolean(status.quality && status.quality.availableFieldCoverage);
  if (!hasQualityCoverage) failures.push('quality.availableFieldCoverage is missing.');

  const emptySearchHasRealRows = empty.results.length > 0
    && empty.results.some((record) => !isUnknown(record.facilityName) && record.totalCO2e != null);
  if (!emptySearchHasRealRows) {
    failures.push('Empty search does not return real CARB rows.');
  }

  const noBinaryGarbageRows = empty.results.every((record) => !hasBinaryGarbageRow(record));
  if (!noBinaryGarbageRows) failures.push('Binary XLSX/PK garbage detected in returned rows.');

  if (status.searchReadiness === 'Ready' && !status.datasetLoaded) {
    failures.push('searchReadiness is Ready while datasetLoaded is false.');
  }

  if (status.searchReadiness === 'Ready' && status.quality.availableFieldCoverage.totalCO2e === 0) {
    failures.push('searchReadiness is Ready but totalCO2e coverage is unusable.');
  }

  if (shell.count === 0) failures.push('Shell search returned zero rows.');
  if (refinery.count === 0) failures.push('Refinery search returned zero rows.');
  if (year2024.count === 0) failures.push('Year 2024 search returned zero rows.');

  warnings.push(...status.warnings);
  warnings.push(...empty.warnings);
  warnings.push(...shell.warnings);
  warnings.push(...refinery.warnings);
  warnings.push(...year2024.warnings);

  return {
    ok: failures.length === 0,
    statusReady: status.searchReadiness === 'Ready' && status.datasetLoaded,
    hasQualityCoverage,
    emptySearchHasRealRows,
    noBinaryGarbageRows,
    shellSearchCount: shell.count,
    refinerySearchCount: refinery.count,
    year2024SearchCount: year2024.count,
    failures: Array.from(new Set(failures)),
    warnings: Array.from(new Set(warnings.filter(Boolean))),
  };
}

export function getCarbImportMeta() {
  return {
    datasetVersion: importedSnapshot.datasetVersion,
    retrievalDate: importedSnapshot.retrievalDate,
    sourceUrl: importedSnapshot.sourceUrl,
    lastImportAt: importedSnapshot.lastImportAt,
  };
}

