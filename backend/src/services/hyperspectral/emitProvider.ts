import { boundingBoxFromPoint, cmrTemporalRange, searchCmrGranulesByShortName, type CmrGranuleSearchResult } from './nasaCmrClient';

export function defaultEmitShortName(): string {
  return process.env.DPAL_EMIT_CMR_SHORT_NAME?.trim() || 'EMITL2ARFL';
}

export async function queryEmitL2aScenes(args: {
  lat: number;
  lng: number;
  radiusKm: number;
  start: Date;
  end: Date;
  token: string;
}): Promise<CmrGranuleSearchResult> {
  const bbox = boundingBoxFromPoint(args.lat, args.lng, args.radiusKm);
  const temporal = cmrTemporalRange(args.start, args.end);
  return searchCmrGranulesByShortName({
    shortName: defaultEmitShortName(),
    provider: 'EMIT',
    boundingBox: bbox,
    temporal,
    token: args.token,
  });
}
