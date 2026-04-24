import fs from 'node:fs/promises';
import path from 'node:path';

export type SourceMode = 'LIVE' | 'IMPORTED' | 'DEMO_FALLBACK';
export type GeneratorStatus = 'LQG' | 'SQG' | 'VSQG' | 'TSDF' | 'Transporter' | 'Unknown';
export type RcraSourceStatus = 'LIVE VERIFIED' | 'RCRA PUBLIC DATA' | 'IMPORTED DATASET' | 'DEMO DATA' | 'MISSING' | 'NEEDS REVIEW';

export interface RcraFacilityRecord {
  epaId: string;
  facilityName: string;
  operatorName: string;
  address: string;
  city: string;
  county: string;
  state: string;
  latitude: number | null;
  longitude: number | null;
  naicsCode: string;
  generatorStatus: GeneratorStatus;
  permitStatus: string;
  complianceStatus: string;
  correctiveActionStatus: string;
  reportingYear: number;
  hazardousWasteTons: number | null;
  wasteCodes: string[];
  manifestCount: number | null;
  transporterCount: number | null;
  receivingFacilityCount: number | null;
  violationsCount: number | null;
  enforcementActionsCount: number | null;
  lastInspectionDate: string;
  sourceStatus: RcraSourceStatus;
  dataSource: string;
  sourceUrl?: string;
  datasetVersion: string;
  retrievalDate: string;
}

type SearchParams = {
  q?: string;
  epaId?: string;
  facilityName?: string;
  city?: string;
  county?: string;
  state?: string;
  generatorStatus?: string;
  reportingYear?: number;
  naicsCode?: string;
  limit?: number;
};

const aliasMap: Record<string, string[]> = {
  epaId: ['epa_id', 'epa id'],
  facilityName: ['facility_name', 'facility name'],
  operatorName: ['operator_name', 'handler name', 'operator name'],
  address: ['address', 'street address'],
  city: ['city'],
  county: ['county'],
  state: ['state'],
  latitude: ['latitude', 'lat'],
  longitude: ['longitude', 'lng', 'lon'],
  naicsCode: ['naics_code', 'naics code'],
  generatorStatus: ['generator_status', 'generator status'],
  permitStatus: ['permit_status', 'permit status'],
  complianceStatus: ['compliance_status', 'compliance status'],
  correctiveActionStatus: ['corrective_action_status', 'corrective action status'],
  reportingYear: ['reporting_year', 'reporting year', 'year'],
  hazardousWasteTons: ['hazardous_waste_tons', 'hazardous waste tons'],
  wasteCodes: ['waste_codes', 'waste codes'],
  manifestCount: ['manifest_count', 'manifest count'],
  transporterCount: ['transporter_count', 'transporter count'],
  receivingFacilityCount: ['receiving_facility_count', 'receiving facility count'],
  violationsCount: ['violations_count', 'violations count'],
  enforcementActionsCount: ['enforcement_actions_count', 'enforcement actions count'],
  lastInspectionDate: ['last_inspection_date', 'last inspection date'],
};

const demoFallback: RcraFacilityRecord[] = [
  {
    epaId: 'CAD982445001',
    facilityName: 'Bay Industrial Solvents',
    operatorName: 'Bay Industrial Group',
    address: '155 Harbor Ave',
    city: 'Richmond',
    county: 'Contra Costa',
    state: 'CA',
    latitude: 37.94,
    longitude: -122.36,
    naicsCode: '324110',
    generatorStatus: 'LQG',
    permitStatus: 'Active',
    complianceStatus: 'Under Routine Review',
    correctiveActionStatus: 'Not Required',
    reportingYear: 2023,
    hazardousWasteTons: 480,
    wasteCodes: ['D001', 'F003'],
    manifestCount: 150,
    transporterCount: 4,
    receivingFacilityCount: 3,
    violationsCount: 2,
    enforcementActionsCount: 0,
    lastInspectionDate: '2024-03-14',
    sourceStatus: 'DEMO DATA',
    dataSource: 'DPAL demo fallback',
    sourceUrl: '',
    datasetVersion: 'demo-v1',
    retrievalDate: new Date().toISOString().slice(0, 10),
  },
  {
    epaId: 'CAD982445001',
    facilityName: 'Bay Industrial Solvents',
    operatorName: 'Bay Industrial Group',
    address: '155 Harbor Ave',
    city: 'Richmond',
    county: 'Contra Costa',
    state: 'CA',
    latitude: 37.94,
    longitude: -122.36,
    naicsCode: '324110',
    generatorStatus: 'LQG',
    permitStatus: 'Active',
    complianceStatus: 'Under Routine Review',
    correctiveActionStatus: 'Not Required',
    reportingYear: 2024,
    hazardousWasteTons: 430,
    wasteCodes: ['D001', 'F003'],
    manifestCount: 148,
    transporterCount: 4,
    receivingFacilityCount: 3,
    violationsCount: 1,
    enforcementActionsCount: 0,
    lastInspectionDate: '2025-02-10',
    sourceStatus: 'DEMO DATA',
    dataSource: 'DPAL demo fallback',
    sourceUrl: '',
    datasetVersion: 'demo-v1',
    retrievalDate: new Date().toISOString().slice(0, 10),
  },
  {
    epaId: 'CAT080011190',
    facilityName: 'South Valley Treatment and Storage',
    operatorName: 'SV Waste Systems',
    address: '404 Process Rd',
    city: 'Bakersfield',
    county: 'Kern',
    state: 'CA',
    latitude: 35.35,
    longitude: -119.02,
    naicsCode: '562211',
    generatorStatus: 'TSDF',
    permitStatus: 'Permit Renewal Pending',
    complianceStatus: 'Needs Follow-up',
    correctiveActionStatus: 'Corrective Action Active',
    reportingYear: 2024,
    hazardousWasteTons: 1120,
    wasteCodes: ['K050', 'F005', 'D018'],
    manifestCount: 312,
    transporterCount: 7,
    receivingFacilityCount: 4,
    violationsCount: 5,
    enforcementActionsCount: 2,
    lastInspectionDate: '2023-11-05',
    sourceStatus: 'DEMO DATA',
    dataSource: 'DPAL demo fallback',
    sourceUrl: '',
    datasetVersion: 'demo-v1',
    retrievalDate: new Date().toISOString().slice(0, 10),
  },
];

let importedRecords: RcraFacilityRecord[] = [];
let importedMeta = { datasetVersion: 'import-not-loaded', retrievalDate: new Date().toISOString().slice(0, 10) };
let importedBootstrapped = false;

const normalizeKey = (value: string) => value.toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
const toNum = (value: unknown): number | null => {
  if (value == null || value === '') return null;
  const n = Number(String(value).replace(/,/g, '').trim());
  return Number.isFinite(n) ? n : null;
};

function getAliasedValue(row: Record<string, unknown>, aliases: string[]): unknown {
  const normalized = Object.entries(row).reduce<Record<string, unknown>>((acc, [k, v]) => {
    acc[normalizeKey(k)] = v;
    return acc;
  }, {});
  for (const alias of aliases) {
    const hit = normalized[normalizeKey(alias)];
    if (hit !== undefined) return hit;
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

function normalizeGeneratorStatus(value: unknown): GeneratorStatus {
  const raw = String(value ?? '').trim().toUpperCase();
  if (raw === 'LQG' || raw === 'SQG' || raw === 'VSQG' || raw === 'TSDF' || raw === 'TRANSPORTER') {
    return raw === 'TRANSPORTER' ? 'Transporter' : (raw as GeneratorStatus);
  }
  return 'Unknown';
}

function normalizeRow(row: Record<string, unknown>, sourceInfo: { dataSource: string; sourceUrl?: string; datasetVersion: string; retrievalDate: string; baseStatus: RcraSourceStatus }): RcraFacilityRecord {
  const epaId = String(getAliasedValue(row, aliasMap.epaId) ?? '').trim();
  const facilityName = String(getAliasedValue(row, aliasMap.facilityName) ?? '').trim();
  const operatorName = String(getAliasedValue(row, aliasMap.operatorName) ?? '').trim();
  const wasteCodesRaw = String(getAliasedValue(row, aliasMap.wasteCodes) ?? '').trim();
  return {
    epaId: epaId || `RCRA-${Math.random().toString(36).slice(2, 9)}`,
    facilityName: facilityName || 'Unknown Facility',
    operatorName: operatorName || 'Unknown Operator',
    address: String(getAliasedValue(row, aliasMap.address) ?? '').trim() || 'Unknown',
    city: String(getAliasedValue(row, aliasMap.city) ?? '').trim() || 'Unknown',
    county: String(getAliasedValue(row, aliasMap.county) ?? '').trim() || 'Unknown',
    state: String(getAliasedValue(row, aliasMap.state) ?? '').trim() || 'Unknown',
    latitude: toNum(getAliasedValue(row, aliasMap.latitude)),
    longitude: toNum(getAliasedValue(row, aliasMap.longitude)),
    naicsCode: String(getAliasedValue(row, aliasMap.naicsCode) ?? '').trim() || 'Unknown',
    generatorStatus: normalizeGeneratorStatus(getAliasedValue(row, aliasMap.generatorStatus)),
    permitStatus: String(getAliasedValue(row, aliasMap.permitStatus) ?? '').trim() || 'Needs Review',
    complianceStatus: String(getAliasedValue(row, aliasMap.complianceStatus) ?? '').trim() || 'Needs Review',
    correctiveActionStatus: String(getAliasedValue(row, aliasMap.correctiveActionStatus) ?? '').trim() || 'Needs Review',
    reportingYear: Number(getAliasedValue(row, aliasMap.reportingYear) ?? new Date().getFullYear()) || new Date().getFullYear(),
    hazardousWasteTons: toNum(getAliasedValue(row, aliasMap.hazardousWasteTons)),
    wasteCodes: wasteCodesRaw ? wasteCodesRaw.split(/[|,;]/).map((item) => item.trim()).filter(Boolean) : [],
    manifestCount: toNum(getAliasedValue(row, aliasMap.manifestCount)),
    transporterCount: toNum(getAliasedValue(row, aliasMap.transporterCount)),
    receivingFacilityCount: toNum(getAliasedValue(row, aliasMap.receivingFacilityCount)),
    violationsCount: toNum(getAliasedValue(row, aliasMap.violationsCount)),
    enforcementActionsCount: toNum(getAliasedValue(row, aliasMap.enforcementActionsCount)),
    lastInspectionDate: String(getAliasedValue(row, aliasMap.lastInspectionDate) ?? '').trim() || 'Unknown',
    sourceStatus: !epaId || !facilityName ? 'NEEDS REVIEW' : sourceInfo.baseStatus,
    dataSource: sourceInfo.dataSource,
    sourceUrl: sourceInfo.sourceUrl,
    datasetVersion: sourceInfo.datasetVersion,
    retrievalDate: sourceInfo.retrievalDate,
  };
}

function applySearch(records: RcraFacilityRecord[], params: SearchParams): RcraFacilityRecord[] {
  const q = (params.q ?? '').toLowerCase().trim();
  const limit = Math.min(Math.max(params.limit ?? 50, 1), 500);
  const filtered = records.filter((record) => {
    if (params.epaId && !record.epaId.toLowerCase().includes(params.epaId.toLowerCase())) return false;
    if (params.facilityName && !record.facilityName.toLowerCase().includes(params.facilityName.toLowerCase())) return false;
    if (params.city && !record.city.toLowerCase().includes(params.city.toLowerCase())) return false;
    if (params.county && !record.county.toLowerCase().includes(params.county.toLowerCase())) return false;
    if (params.state && !record.state.toLowerCase().includes(params.state.toLowerCase())) return false;
    if (params.generatorStatus && record.generatorStatus.toLowerCase() !== params.generatorStatus.toLowerCase()) return false;
    if (params.naicsCode && !record.naicsCode.toLowerCase().includes(params.naicsCode.toLowerCase())) return false;
    if (params.reportingYear && record.reportingYear !== params.reportingYear) return false;
    if (q) {
      const hit =
        record.facilityName.toLowerCase().includes(q) ||
        record.operatorName.toLowerCase().includes(q) ||
        record.epaId.toLowerCase().includes(q);
      if (!hit) return false;
    }
    return true;
  });
  return filtered
    .sort((a, b) => {
      const facilityCompare = a.facilityName.localeCompare(b.facilityName, undefined, { sensitivity: 'base' });
      if (facilityCompare !== 0) return facilityCompare;
      return b.reportingYear - a.reportingYear;
    })
    .slice(0, limit);
}

async function loadImportedFromDiskIfAny(): Promise<void> {
  if (importedBootstrapped) return;
  importedBootstrapped = true;
  const targetDir = path.resolve(process.cwd(), 'data', 'rcra');
  try {
    const files = await fs.readdir(targetDir);
    const loadable = files.filter((f) => f.toLowerCase().endsWith('.json') || f.toLowerCase().endsWith('.csv'));
    if (!loadable.length) return;
    const out: RcraFacilityRecord[] = [];
    for (const file of loadable) {
      const fullPath = path.join(targetDir, file);
      const text = await fs.readFile(fullPath, 'utf8');
      const rows: Record<string, unknown>[] = file.toLowerCase().endsWith('.json')
        ? (Array.isArray(JSON.parse(text)) ? JSON.parse(text) : [])
        : csvToRows(text);
      for (const row of rows) {
        out.push(normalizeRow(row, {
          dataSource: `Imported RCRA dataset (${file})`,
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
    // Optional directory.
  }
}

async function fetchLiveDataset(): Promise<{ records: RcraFacilityRecord[]; warnings: string[] }> {
  const liveUrl = process.env.RCRA_LIVE_DATA_URL?.trim();
  if (!liveUrl) return { records: [], warnings: ['No live RCRA source configured. Set RCRA_LIVE_DATA_URL to enable live mode.'] };
  try {
    const response = await fetch(liveUrl);
    if (!response.ok) return { records: [], warnings: [`Live RCRA source returned HTTP ${response.status}.`] };
    const text = await response.text();
    const contentType = response.headers.get('content-type') ?? '';
    const rows: Record<string, unknown>[] = contentType.includes('json')
      ? (Array.isArray(JSON.parse(text)) ? JSON.parse(text) : [])
      : csvToRows(text);
    return {
      records: rows.map((row) => normalizeRow(row, {
        dataSource: 'RCRA live/public dataset',
        sourceUrl: liveUrl,
        datasetVersion: process.env.RCRA_LIVE_DATASET_VERSION || 'live-unknown',
        retrievalDate: new Date().toISOString().slice(0, 10),
        baseStatus: 'RCRA PUBLIC DATA',
      })),
      warnings: [],
    };
  } catch (error) {
    return { records: [], warnings: [`Live RCRA source fetch failed: ${error instanceof Error ? error.message : 'unknown error'}`] };
  }
}

export async function searchRcraFacilityRecords(params: SearchParams): Promise<{ results: RcraFacilityRecord[]; count: number; sourceMode: SourceMode; warnings: string[] }> {
  const live = await fetchLiveDataset();
  await loadImportedFromDiskIfAny();
  let sourceMode: SourceMode = 'LIVE';
  let selected = live.records;
  const warnings = [...live.warnings];
  if (!selected.length) {
    if (importedRecords.length) {
      sourceMode = 'IMPORTED';
      selected = importedRecords;
    } else {
      sourceMode = 'DEMO_FALLBACK';
      selected = demoFallback.map((row) => ({ ...row, sourceStatus: 'DEMO DATA' }));
      warnings.push('Using demo fallback records because live/imported RCRA data is unavailable.');
    }
  }
  const results = applySearch(selected, params);
  return { results, count: results.length, sourceMode, warnings };
}

export async function importRcraDataset(input: { records?: unknown[]; csvText?: string; jsonText?: string; datasetVersion?: string; sourceUrl?: string }): Promise<{ imported: number; warnings: string[] }> {
  const warnings: string[] = [];
  const rows: Record<string, unknown>[] = [];
  if (Array.isArray(input.records)) rows.push(...(input.records as Record<string, unknown>[]));
  if (input.csvText) rows.push(...csvToRows(input.csvText));
  if (input.jsonText) {
    try {
      const parsed = JSON.parse(input.jsonText);
      if (Array.isArray(parsed)) rows.push(...(parsed as Record<string, unknown>[]));
      else warnings.push('jsonText parsed but was not an array.');
    } catch {
      warnings.push('jsonText could not be parsed.');
    }
  }
  if (!rows.length) return { imported: 0, warnings: [...warnings, 'No rows provided for import.'] };
  importedRecords = rows.map((row) =>
    normalizeRow(row, {
      dataSource: 'Imported RCRA dataset',
      sourceUrl: input.sourceUrl ?? '',
      datasetVersion: input.datasetVersion ?? `manual-import-${Date.now()}`,
      retrievalDate: new Date().toISOString().slice(0, 10),
      baseStatus: 'IMPORTED DATASET',
    }),
  );
  importedMeta = {
    datasetVersion: input.datasetVersion ?? `manual-import-${Date.now()}`,
    retrievalDate: new Date().toISOString().slice(0, 10),
  };
  importedBootstrapped = true;
  return { imported: importedRecords.length, warnings };
}

export function getRcraImportMeta() {
  return importedMeta;
}
