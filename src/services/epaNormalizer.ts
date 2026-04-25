import type {
  EpaEmissionRecord,
  EpaFacilityRecord,
  EpaGasRecord,
  EpaFacilityProfile,
} from '../types/epa';

function toStringSafe(value: unknown): string {
  if (value == null) return '';
  return String(value).trim();
}

function toNumberSafe(value: unknown): number | null {
  if (value == null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Read first present key from row (EPA JSON is usually snake_case; metadata docs use UPPER). */
function pick(row: Record<string, unknown>, ...keys: string[]): unknown {
  for (const key of keys) {
    if (key in row && row[key] != null && row[key] !== '') return row[key];
  }
  return undefined;
}

export function normalizeFacilityRow(row: Record<string, unknown>): EpaFacilityRecord {
  return {
    facilityId: toStringSafe(pick(row, 'facility_id', 'FACILITY_ID')),
    facilityName: toStringSafe(pick(row, 'facility_name', 'FACILITY_NAME')),
    address1: toStringSafe(pick(row, 'address1', 'ADDRESS1')),
    address2: toStringSafe(pick(row, 'address2', 'ADDRESS2')),
    city: toStringSafe(pick(row, 'city', 'CITY')),
    county: toStringSafe(pick(row, 'county', 'COUNTY')),
    state: toStringSafe(pick(row, 'state', 'STATE')),
    stateName: toStringSafe(pick(row, 'state_name', 'STATE_NAME')),
    zip: toStringSafe(pick(row, 'zip', 'ZIP')),
    latitude: toNumberSafe(pick(row, 'latitude', 'LATITUDE', 'latitude83', 'LATITUDE83')),
    longitude: toNumberSafe(pick(row, 'longitude', 'LONGITUDE', 'longitude83', 'LONGITUDE83')),
    parentCompany: toStringSafe(pick(row, 'parent_company', 'PARENT_COMPANY')),
    frsId: toStringSafe(pick(row, 'frs_id', 'FRS_ID')),
    facilityTypes: toStringSafe(pick(row, 'facility_types', 'FACILITY_TYPES')),
    reportedIndustryTypes: toStringSafe(pick(row, 'reported_industry_types', 'REPORTED_INDUSTRY_TYPES')),
    reportedSubparts: toStringSafe(pick(row, 'reported_subparts', 'REPORTED_SUBPARTS')),
    year: toNumberSafe(pick(row, 'year', 'YEAR')),
  };
}

export function normalizeEmissionRow(row: Record<string, unknown>): EpaEmissionRecord {
  return {
    facilityId: toStringSafe(pick(row, 'facility_id', 'FACILITY_ID')),
    co2eEmission: toNumberSafe(pick(row, 'co2e_emission', 'CO2E_EMISSION')),
    gasId: toStringSafe(pick(row, 'gas_id', 'GAS_ID')),
    subPartId: toStringSafe(pick(row, 'sub_part_id', 'SUB_PART_ID')),
    year: toNumberSafe(pick(row, 'year', 'YEAR')),
  };
}

export function normalizeGasRow(row: Record<string, unknown>): EpaGasRecord {
  return {
    gasId: toStringSafe(pick(row, 'gas_id', 'GAS_ID')),
    gasName: toStringSafe(pick(row, 'gas_name', 'GAS_NAME')),
    gasCode: toStringSafe(pick(row, 'gas_code', 'GAS_CODE')),
    gasLabel: toStringSafe(pick(row, 'gas_label', 'GAS_LABEL')),
  };
}

export function buildFacilityProfiles(
  facilities: EpaFacilityRecord[],
  emissions: EpaEmissionRecord[],
  gases: EpaGasRecord[],
): EpaFacilityProfile[] {
  const gasById = new Map(gases.map((g) => [g.gasId, g]));
  const emissionsByFacility = new Map<string, EpaEmissionRecord[]>();
  for (const emission of emissions) {
    const bucket = emissionsByFacility.get(emission.facilityId) ?? [];
    bucket.push(emission);
    emissionsByFacility.set(emission.facilityId, bucket);
  }

  return facilities.map((facility) => {
    const facilityEmissions = emissionsByFacility.get(facility.facilityId) ?? [];
    const grouped = new Map<string, number>();
    const years = new Set<number>();
    let totalCo2e = 0;
    let hasEmission = false;

    for (const row of facilityEmissions) {
      if (typeof row.year === 'number') years.add(row.year);
      if (typeof row.co2eEmission === 'number') {
        hasEmission = true;
        totalCo2e += row.co2eEmission;
        grouped.set(row.gasId, (grouped.get(row.gasId) ?? 0) + row.co2eEmission);
      }
    }

    const byGas = Array.from(grouped.entries()).map(([gasId, co2eEmission]) => {
      const gas = gasById.get(gasId);
      return {
        gasId,
        gasName: gas?.gasName ?? 'Unknown Gas',
        gasCode: gas?.gasCode ?? '',
        gasLabel: gas?.gasLabel ?? '',
        co2eEmission,
      };
    });

    return {
      facility,
      emissions: {
        totalCo2e: hasEmission ? totalCo2e : null,
        byGas,
        reportingYears: Array.from(years).sort((a, b) => b - a),
      },
      statusLabel: 'Official EPA Record',
    };
  });
}
