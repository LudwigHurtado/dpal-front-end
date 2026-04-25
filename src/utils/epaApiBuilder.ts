type EpaOperator = 'equals' | 'contains';

const EPA_BASE_URL = 'https://data.epa.gov/efservice';

function encodeSegment(value: string): string {
  return encodeURIComponent(value.trim());
}

export function buildEpaTableUrl(table: string, startRow: number, endRow: number): string {
  return `${EPA_BASE_URL}/${table}/ROWS/${startRow}:${endRow}/JSON`;
}

export function buildEpaFilteredUrl(
  table: string,
  field: string,
  operator: EpaOperator,
  value: string,
  startRow: number,
  endRow: number,
): string {
  return `${EPA_BASE_URL}/${table}/${encodeSegment(field)}/${operator}/${encodeSegment(value)}/${startRow}:${endRow}/JSON`;
}

export function buildEpaMultiFilterUrl(
  table: string,
  filters: Array<{ field: string; operator: EpaOperator; value: string }>,
  startRow: number,
  endRow: number,
): string {
  const segments = filters.flatMap((entry) => [
    encodeSegment(entry.field),
    entry.operator,
    encodeSegment(entry.value),
  ]);
  return `${EPA_BASE_URL}/${table}/${segments.join('/')}/${startRow}:${endRow}/JSON`;
}
