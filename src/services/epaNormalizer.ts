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

export function normalizeFacilityRow(row: Record<string, unknown>): EpaFacilityRecord {
  return {
    facilityId: toStringSafe(row.FACILITY_ID),
    facilityName: toStringSafe(row.FACILITY_NAME),
    address1: toStringSafe(row.ADDRESS1),
    address2: toStringSafe(row.ADDRESS2),
    city: toStringSafe(row.CITY),
    county: toStringSafe(row.COUNTY),
    state: toStringSafe(row.STATE),
    stateName: toStringSafe(row.STATE_NAME),
    zip: toStringSafe(row.ZIP),
    latitude: toNumberSafe(row.LATITUDE),
    longitude: toNumberSafe(row.LONGITUDE),
    parentCompany: toStringSafe(row.PARENT_COMPANY),
    frsId: toStringSafe(row.FRS_ID),
    facilityTypes: toStringSafe(row.FACILITY_TYPES),
    reportedIndustryTypes: toStringSafe(row.REPORTED_INDUSTRY_TYPES),
    reportedSubparts: toStringSafe(row.REPORTED_SUBPARTS),
    year: toNumberSafe(row.YEAR),
  };
}

export function normalizeEmissionRow(row: Record<string, unknown>): EpaEmissionRecord {
  return {
    facilityId: toStringSafe(row.FACILITY_ID),
    co2eEmission: toNumberSafe(row.CO2E_EMISSION),
    gasId: toStringSafe(row.GAS_ID),
    subPartId: toStringSafe(row.SUB_PART_ID),
    year: toNumberSafe(row.YEAR),
  };
}

export function normalizeGasRow(row: Record<string, unknown>): EpaGasRecord {
  return {
    gasId: toStringSafe(row.GAS_ID),
    gasName: toStringSafe(row.GAS_NAME),
    gasCode: toStringSafe(row.GAS_CODE),
    gasLabel: toStringSafe(row.GAS_LABEL),
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
