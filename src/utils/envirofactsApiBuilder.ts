const EPA_BASE = 'https://data.epa.gov/efservice';

function enc(value: string): string {
  return encodeURIComponent(value.trim());
}

export function buildEnvirofactsTableUrl(table: string, start: number, end: number): string {
  return `${EPA_BASE}/${table}/rows/${start}:${end}/json`;
}

export function buildEnvirofactsFilterUrl(
  table: string,
  field: string,
  operator: 'equals' | 'contains' | 'beginsWith',
  value: string,
  start: number,
  end: number,
): string {
  return `${EPA_BASE}/${table}/${enc(field)}/${operator}/${enc(value)}/${start}:${end}/json`;
}
