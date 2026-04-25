/**
 * EPA Envirofacts Data Service REST shape:
 * https://data.epa.gov/efservice/[table]/[column][operator][value]/[join]/[first]:[last]/[sort]/[format]
 * @see https://www.epa.gov/enviro/envirofacts-data-service-api
 */

const EPA_BASE = 'https://data.epa.gov/efservice';

export const ENVIROFACTS_GEO_TABLE = 'lookups.mv_new_geo_best_picks';

export type EnvirofactsOperator = 'equals' | 'contains' | 'beginsWith';

function enc(value: string): string {
  return encodeURIComponent(value.trim());
}

/** Trim; block full URLs and path traversal; strip slashes from values. */
export function sanitizeEnvirofactsSegment(value: string): string {
  let t = value.trim();
  if (!t) return '';
  if (/https?:\/\//i.test(t)) return '';
  if (/^\/\//.test(t)) return '';
  t = t.replace(/\\/g, '').replace(/\//g, '');
  return t.trim();
}

export function sanitizeStateCode(state: string): string {
  const s = sanitizeEnvirofactsSegment(state).toUpperCase().slice(0, 2);
  return /^[A-Z]{2}$/.test(s) ? s : '';
}

export function sanitizeZip(zip: string): string {
  return sanitizeEnvirofactsSegment(zip).replace(/[^\dA-Za-z-]/g, '').slice(0, 10);
}

type Triple = { field: string; operator: EnvirofactsOperator; value: string };

/**
 * Build a full EPA efservice URL. Only concatenates trusted path segments after EPA_BASE.
 * Pagination: 1-based inclusive first:last (EPA indexing).
 */
export function buildEnvirofactsServiceUrl(
  table: string,
  filterPath: Array<Triple | 'and'>,
  firstInclusive: number | null,
  lastInclusive: number | null,
): string {
  const segments: string[] = [EPA_BASE, table];
  for (const part of filterPath) {
    if (part === 'and') {
      segments.push('and');
    } else {
      segments.push(enc(part.field), part.operator, enc(part.value));
    }
  }
  if (firstInclusive != null && lastInclusive != null) {
    segments.push(`${firstInclusive}:${lastInclusive}`);
  }
  segments.push('json');
  return segments.join('/');
}

export function buildZipBeginsWithUrl(zip: string, first: number, last: number): string {
  return buildEnvirofactsServiceUrl(
    ENVIROFACTS_GEO_TABLE,
    [{ field: 'postal_code', operator: 'beginsWith', value: zip }],
    first,
    last,
  );
}

export function buildStateEqualsUrl(state: string, first: number, last: number): string {
  return buildEnvirofactsServiceUrl(
    ENVIROFACTS_GEO_TABLE,
    [{ field: 'state_code', operator: 'equals', value: state }],
    first,
    last,
  );
}

export function buildCountyUrl(state: string, county: string, first: number, last: number): string {
  return buildEnvirofactsServiceUrl(
    ENVIROFACTS_GEO_TABLE,
    [
      { field: 'state_code', operator: 'equals', value: state },
      'and',
      { field: 'county_name', operator: 'equals', value: county },
    ],
    first,
    last,
  );
}

export function buildCityContainsUrl(city: string, first: number, last: number): string {
  return buildEnvirofactsServiceUrl(
    ENVIROFACTS_GEO_TABLE,
    [{ field: 'city_name', operator: 'contains', value: city }],
    first,
    last,
  );
}

export function buildFacilityNameUrl(name: string, first: number, last: number): string {
  return buildEnvirofactsServiceUrl(
    ENVIROFACTS_GEO_TABLE,
    [{ field: 'primary_name', operator: 'contains', value: name }],
    first,
    last,
  );
}

export function buildStateAndCityUrl(state: string, city: string, first: number, last: number): string {
  return buildEnvirofactsServiceUrl(
    ENVIROFACTS_GEO_TABLE,
    [
      { field: 'state_code', operator: 'equals', value: state },
      'and',
      { field: 'city_name', operator: 'contains', value: city },
    ],
    first,
    last,
  );
}

export function buildAddressContainsUrl(address: string, first: number, last: number): string {
  return buildEnvirofactsServiceUrl(
    ENVIROFACTS_GEO_TABLE,
    [{ field: 'location_address', operator: 'contains', value: address }],
    first,
    last,
  );
}

/** Water body / geographic name — column name varies; use primary_name as searchable proxy when dedicated column unknown. */
export function buildWaterBodyContainsUrl(term: string, first: number, last: number): string {
  return buildEnvirofactsServiceUrl(
    ENVIROFACTS_GEO_TABLE,
    [{ field: 'primary_name', operator: 'contains', value: term }],
    first,
    last,
  );
}

export function buildCountyContainsOnlyUrl(county: string, first: number, last: number): string {
  return buildEnvirofactsServiceUrl(
    ENVIROFACTS_GEO_TABLE,
    [{ field: 'county_name', operator: 'contains', value: county }],
    first,
    last,
  );
}

export function buildTableBrowseUrl(first: number, last: number): string {
  return buildEnvirofactsServiceUrl(ENVIROFACTS_GEO_TABLE, [], first, last);
}
