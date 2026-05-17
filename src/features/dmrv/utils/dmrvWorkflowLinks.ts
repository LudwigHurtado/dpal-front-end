import type { DmrvProjectContext, DmrvProjectValidationResult } from '../services/dmrvProjectContextTypes';

export type DmrvWorkflowLinkStatus = 'ready' | 'partial' | 'pending';

export type DmrvWorkflowLink = {
  id: string;
  label: string;
  status: DmrvWorkflowLinkStatus;
  detail: string;
};

export function computeDmrvProjectWorkflowLinks(
  ctx: DmrvProjectContext,
  validation: DmrvProjectValidationResult | null,
): DmrvWorkflowLink[] {
  const coordOk = validation?.coordinateOk ?? false;
  const hasPolygon = ctx.location.aoiGeoJson.trim().length > 0;
  const hasName = ctx.projectName.trim().length > 0;
  const hasProjectId = ctx.projectId.trim().length > 0;
  const hasMethodology = ctx.methodology.name.trim().length > 0;
  const hasReporting = Boolean(ctx.reporting.startDate.trim() && ctx.reporting.endDate.trim());
  const hasHash = Boolean(ctx.blockchain.configHash?.trim());
  const anchored = ctx.blockchain.status === 'anchored';

  return [
    {
      id: 'location',
      label: 'Location / AOI',
      status: coordOk ? (hasPolygon ? 'ready' : 'partial') : 'pending',
      detail: coordOk
        ? hasPolygon
          ? 'Coordinates + polygon flow to satellite scans and evidence packets.'
          : 'Center point saved — add a polygon when the MRV type needs a boundary.'
        : 'Pick a map center or finish an AOI polygon.',
    },
    {
      id: 'identity',
      label: 'Project identity',
      status: hasName && hasProjectId ? 'ready' : hasName || hasProjectId ? 'partial' : 'pending',
      detail: 'Name and ID are stamped on evidence packets and anchor payloads.',
    },
    {
      id: 'satellite',
      label: 'Satellite & evidence',
      status: coordOk && hasProjectId ? 'ready' : coordOk ? 'partial' : 'pending',
      detail: coordOk
        ? 'Open satellite config — scenes use this lat/lng and AOI context.'
        : 'Save location first so satellite sources inherit coordinates.',
    },
    {
      id: 'methodology',
      label: 'Methodology & reporting',
      status: hasMethodology && hasReporting ? 'ready' : hasMethodology || hasReporting ? 'partial' : 'pending',
      detail: 'Methodology + reporting period appear in integrity review and anchor metadata.',
    },
    {
      id: 'blockchain',
      label: 'Blockchain identity',
      status: anchored ? 'ready' : hasHash ? 'partial' : 'pending',
      detail: anchored
        ? 'Project identity anchored — links to ledger / QR evidence root when configured.'
        : hasHash
          ? 'Config hash ready — anchor when evidence configuration is complete.'
          : 'Generate config hash after location and sources are set.',
    },
  ];
}
