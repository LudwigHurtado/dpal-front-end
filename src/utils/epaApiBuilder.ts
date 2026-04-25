type EpaOperator = 'equals' | 'contains';

const EPA_BASE_URL = 'https://data.epa.gov/efservice';

function encodeSegment(value: string): string {
  return encodeURIComponent(value.trim());
}

/**
 * Envirofacts URL shape (see https://www.epa.gov/enviro/envirofacts-data-service-api):
 *   [table]/[column][operator][value]/.../[first]:[last]/[format]
 * First row is 1-based (not zero). Do not use legacy ROWS/0:N for GHGRP tables.
 */
export function buildEpaTableUrl(qualifiedTable: string, firstInclusive: number, lastInclusive: number): string {
  return `${EPA_BASE_URL}/${qualifiedTable}/${firstInclusive}:${lastInclusive}/json`;
}

export function buildEpaFilteredUrl(
  qualifiedTable: string,
  field: string,
  operator: EpaOperator,
  value: string,
  firstInclusive: number,
  lastInclusive: number,
): string {
  return `${EPA_BASE_URL}/${qualifiedTable}/${encodeSegment(field)}/${operator}/${encodeSegment(value)}/${firstInclusive}:${lastInclusive}/json`;
}

/** Multiple filters combined with /and/ (EPA conjunction syntax). */
export function buildEpaMultiFilterUrl(
  qualifiedTable: string,
  filters: Array<{ field: string; operator: EpaOperator; value: string }>,
  firstInclusive: number,
  lastInclusive: number,
): string {
  const triples = filters.map(
    (entry) => `${encodeSegment(entry.field)}/${entry.operator}/${encodeSegment(entry.value)}`,
  );
  return `${EPA_BASE_URL}/${qualifiedTable}/${triples.join('/and/')}/${firstInclusive}:${lastInclusive}/json`;
}
