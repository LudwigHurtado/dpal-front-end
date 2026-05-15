import { boundingBoxFromPoint, cmrTemporalRange, searchCmrGranulesByShortName, type CmrGranuleSearchResult } from './nasaCmrClient';

export function defaultPaceShortName(): string {
  return process.env.DPAL_PACE_CMR_SHORT_NAME?.trim() || 'PACE_OCI_L2_BGC';
}

export async function queryPaceScenes(args: {
  lat: number;
  lng: number;
  radiusKm: number;
  start: Date;
  end: Date;
  token: string;
  pageSize?: number;
}): Promise<CmrGranuleSearchResult> {
  const bbox = boundingBoxFromPoint(args.lat, args.lng, args.radiusKm);
  const temporal = cmrTemporalRange(args.start, args.end);
  return searchCmrGranulesByShortName({
    shortName: defaultPaceShortName(),
    provider: 'PACE',
    boundingBox: bbox,
    temporal,
    pageSize: args.pageSize,
    token: args.token,
  });
}
