import { VIEW_PATHS } from '../../../../utils/appRoutes';
import type { CarbonPuraAttachmentStatus, ExistingDpalModule } from '../../environmentalIntegrity/environmentalIntegrityTypes';

export const CARBONPURA_PARTNER_ID = 'carbonpura';
export const CARBONPURA_DEMO_PROJECT_ID = 'carbonpura-demo-001';

export type CarbonPuraEngineDef = ExistingDpalModule & {
  supportsContextLink: boolean;
  attachmentStatus: CarbonPuraAttachmentStatus;
  verifyNote: string;
};

/** Confirmed live SPA routes — sourced from `VIEW_PATHS` in appRoutes.ts. */
export const CARBONPURA_LIVE_ENGINES: CarbonPuraEngineDef[] = [
  {
    id: 'water-ops',
    viewKey: 'waterOperationsEngine',
    label: 'Water Operations Engine',
    routePath: VIEW_PATHS.waterOperationsEngine,
    purpose:
      'Project-based water monitoring, validator workflow, reports, snapshots, impact tracking, and DPAL Verified Water Impact Credits.',
    statusLabel: 'Live route',
    supportsContextLink: true,
    attachmentStatus: 'target_module_pending',
    verifyNote: 'Validator queue and project summaries live inside the Water Operations Engine.',
  },
  {
    id: 'aquascan',
    viewKey: 'aquaScanWater',
    label: 'AquaScan Technical Water Scan',
    routePath: VIEW_PATHS.aquaScanWater,
    purpose:
      'Technical AOI water satellite analysis, overlays, before/after comparison, and evidence packet support.',
    statusLabel: 'Live route',
    supportsContextLink: true,
    attachmentStatus: 'target_module_pending',
    verifyNote: 'AOI workflows and Copernicus comparisons run inside AquaScan — not from this hub.',
  },
  {
    id: 'plastic-watch',
    viewKey: 'hyperspectralPlasticWatch',
    label: 'Hyperspectral Plastic Watch / PACE Intelligence',
    routePath: VIEW_PATHS.hyperspectralPlasticWatch,
    purpose:
      'PACE/EMIT/Sentinel/Landsat plastic-risk screening, spectral signatures, provider readiness, confounder checks, field validation, and evidence packet generation.',
    statusLabel: 'Live route',
    supportsContextLink: true,
    attachmentStatus: 'target_module_pending',
    verifyNote: 'Provider status is polled here; scans run only inside the Plastic Watch workspace.',
  },
  {
    id: 'carbon-mrv',
    viewKey: 'carbonMRV',
    label: 'Carbon MRV Engine',
    routePath: VIEW_PATHS.carbonMRV,
    purpose:
      'Carbon project monitoring, baseline/additionality support, and carbon/CO₂e evidence workflows.',
    statusLabel: 'Live route',
    supportsContextLink: false,
    attachmentStatus: 'live_route',
    verifyNote: 'Air-quality and mineral adapters are available from the Carbon MRV dashboard tabs.',
  },
  {
    id: 'forest-integrity',
    viewKey: 'forestIntegrity',
    label: 'Forest Integrity',
    routePath: VIEW_PATHS.forestIntegrity,
    purpose:
      'Forest/biomass monitoring, NDVI/NBR/NDMI-style intelligence, and deforestation/reversal-risk support.',
    statusLabel: 'Live route',
    supportsContextLink: false,
    attachmentStatus: 'live_route',
    verifyNote: 'Satellite screening runs inside Forest Integrity when the operator initiates a scan.',
  },
  {
    id: 'air-quality',
    viewKey: 'airQualityMonitor',
    label: 'Air Quality / ppm Intelligence',
    routePath: VIEW_PATHS.airQualityMonitor,
    purpose:
      'Air readings, pollutants, ppm/ppb/µg/m³ normalization, OpenAQ-style monitoring, and emissions context.',
    statusLabel: 'Live route',
    supportsContextLink: false,
    attachmentStatus: 'live_route',
    verifyNote: 'Opens Carbon MRV with the air-quality tab — live reads depend on API configuration.',
  },
  {
    id: 'hazardous-waste',
    viewKey: 'hazardousWasteAudit',
    label: 'Hazardous Waste / Compliance Audit',
    routePath: VIEW_PATHS.hazardousWasteAudit,
    purpose:
      'Hazardous waste facility checks, industrial proximity, compliance history, and environmental risk evidence.',
    statusLabel: 'Live route',
    supportsContextLink: false,
    attachmentStatus: 'live_route',
    verifyNote: 'Facility intake and audit persistence depend on backend `/api/hazardous-waste-audit/*` host.',
  },
  {
    id: 'env-hub',
    viewKey: 'environmentalIntelligenceHub',
    label: 'Environmental Intelligence Hub',
    routePath: VIEW_PATHS.environmentalIntelligenceHub,
    purpose:
      'Main DPAL environmental hub connecting carbon, water, plastic, forest, air, EPA, and satellite intelligence.',
    statusLabel: 'Live route',
    supportsContextLink: false,
    attachmentStatus: 'live_route',
    verifyNote: 'Use the hub to review cross-module entry points and accountability workflows.',
  },
];

export function buildCarbonPuraContextHref(
  routePath: string,
  options?: { includeProjectId?: boolean },
): string {
  const params = new URLSearchParams({ partner: CARBONPURA_PARTNER_ID });
  if (options?.includeProjectId) {
    params.set('projectId', CARBONPURA_DEMO_PROJECT_ID);
  }
  return `${routePath}?${params.toString()}`;
}
