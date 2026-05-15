import { VIEW_PATHS } from '../../../../utils/appRoutes';
import { buildCarbonPuraContextUrl } from './carbonPuraProjectContext';

/** Honest verification labels — do not imply live scans or backend attachment. */
export type VerificationRouteStatus =
  | 'Route registered in SPA'
  | 'Opens correctly'
  | 'Needs manual scan test'
  | 'Not tested';

export type VerificationBannerStatus =
  | 'Context banner confirmed'
  | 'Context banner implemented (code)'
  | 'Context banner not implemented'
  | 'N/A — no context route';

export type VerificationProviderStatus =
  | 'Provider pending'
  | 'Provider polled from hub'
  | 'Needs backend support'
  | 'Not applicable';

export type VerificationAttachmentStatus = 'Attachment pending' | 'Local draft only';

export type VerificationNextAction =
  | 'Manual route test'
  | 'Manual scan test (operator-initiated)'
  | 'Add context banner'
  | 'Wire evidence attachment API'
  | 'Confirm provider on API host'
  | 'None — route-only module';

export type CarbonPuraModuleQaItem = {
  id: string;
  label: string;
  codeVerified?: boolean;
};

export type CarbonPuraModuleVerificationRow = {
  id: string;
  moduleName: string;
  nativeRoute: string;
  contextRoute: string | null;
  routeStatus: VerificationRouteStatus;
  contextBannerStatus: VerificationBannerStatus;
  providerStatus: VerificationProviderStatus;
  evidenceAttachmentStatus: VerificationAttachmentStatus;
  verificationNotes: string;
  nextAction: VerificationNextAction;
  evidenceExportPath: string;
  qaChecklist: CarbonPuraModuleQaItem[];
  /** Maps to live-status probe when applicable. */
  providerProbeKey?: 'plastic' | 'water' | 'copernicus' | 'api' | null;
};

const QA_TEMPLATE: Omit<CarbonPuraModuleQaItem, 'id'>[] = [
  { label: 'Route opens without crash', codeVerified: false },
  { label: 'Context link does not break native route', codeVerified: false },
  { label: 'CarbonPura banner appears when context params present (if implemented)', codeVerified: false },
  { label: 'Module does not auto-run expensive scan on load', codeVerified: false },
  { label: 'Native workflow controls still visible', codeVerified: false },
  { label: 'Result / evidence export path identified', codeVerified: false },
  { label: 'Evidence attachment to CarbonPura documented as pending', codeVerified: true },
];

function qa(id: string): CarbonPuraModuleQaItem[] {
  return QA_TEMPLATE.map((item, index) => ({
    id: `${id}-qa-${index}`,
    ...item,
  }));
}

/**
 * Phase 3 verification matrix — statuses reflect code audit + documented readiness.
 * E2E smoke tests update "Opens correctly" separately; this file does not fake manual QA.
 */
export const CARBONPURA_MODULE_VERIFICATION: CarbonPuraModuleVerificationRow[] = [
  {
    id: 'water-ops',
    moduleName: 'Water Operations Engine',
    nativeRoute: VIEW_PATHS.waterOperationsEngine,
    contextRoute: buildCarbonPuraContextUrl(VIEW_PATHS.waterOperationsEngine),
    routeStatus: 'Route registered in SPA',
    contextBannerStatus: 'Context banner implemented (code)',
    providerStatus: 'Provider polled from hub',
    evidenceAttachmentStatus: 'Attachment pending',
    verificationNotes:
      'Live route in App.tsx. CarbonPuraContextBanner mounted in WaterMonitorView.tsx. Playwright smoke passes with API stubs. Validator queue and evidence exports are module-native; hub does not auto-run satellite refresh.',
    nextAction: 'Manual scan test (operator-initiated)',
    evidenceExportPath: 'Water Operations Engine → project detail → reports / evidence (module-native)',
    providerProbeKey: 'water',
    qaChecklist: qa('water-ops'),
  },
  {
    id: 'aquascan',
    moduleName: 'AquaScan Technical Water Scan',
    nativeRoute: VIEW_PATHS.aquaScanWater,
    contextRoute: buildCarbonPuraContextUrl(VIEW_PATHS.aquaScanWater, undefined, {
      sourceSuite: 'OC_IOP',
    }),
    routeStatus: 'Route registered in SPA',
    contextBannerStatus: 'Context banner implemented (code)',
    providerStatus: 'Provider polled from hub',
    evidenceAttachmentStatus: 'Attachment pending',
    verificationNotes:
      'Live route at /water/aquascan. Banner in AquaScanView.tsx. Copernicus/water reads depend on VITE_API_BASE; scans only when operator runs workflow inside AquaScan.',
    nextAction: 'Manual scan test (operator-initiated)',
    evidenceExportPath: 'AquaScan → Evidence Packet tab (module-native export)',
    providerProbeKey: 'copernicus',
    qaChecklist: qa('aquascan'),
  },
  {
    id: 'plastic-watch',
    moduleName: 'Hyperspectral Plastic Watch / PACE Intelligence',
    nativeRoute: VIEW_PATHS.hyperspectralPlasticWatch,
    contextRoute: buildCarbonPuraContextUrl(VIEW_PATHS.hyperspectralPlasticWatch, undefined, {
      sourceSuite: 'OC_AOP',
    }),
    routeStatus: 'Route registered in SPA',
    contextBannerStatus: 'Context banner implemented (code)',
    providerStatus: 'Provider polled from hub',
    evidenceAttachmentStatus: 'Attachment pending',
    verificationNotes:
      'PACE/EMIT/Sentinel lanes in Plastic Watch only. Banner in HyperspectralPlasticWatchPage.tsx. Playwright smoke passes with full provider-status stub. PACE supports plastic-risk confidence layer — not standalone proof of plastic pollution.',
    nextAction: 'Manual scan test (operator-initiated)',
    evidenceExportPath: 'Plastic Watch → Evidence Packet panel (POST when API configured)',
    providerProbeKey: 'plastic',
    qaChecklist: qa('plastic-watch'),
  },
  {
    id: 'carbon-mrv',
    moduleName: 'Carbon MRV Engine',
    nativeRoute: VIEW_PATHS.carbonMRV,
    contextRoute: null,
    routeStatus: 'Route registered in SPA',
    contextBannerStatus: 'N/A — no context route',
    providerStatus: 'Needs backend support',
    evidenceAttachmentStatus: 'Attachment pending',
    verificationNotes:
      'Opens at /carbon. No CarbonPura context banner wired. Air-quality and mineral adapters live on dashboard when API host exposes /api/carbon/*.',
    nextAction: 'Manual route test',
    evidenceExportPath: 'Carbon MRV → project detail → MRV / ledger sections',
    providerProbeKey: null,
    qaChecklist: qa('carbon-mrv'),
  },
  {
    id: 'forest-integrity',
    moduleName: 'Forest Integrity',
    nativeRoute: VIEW_PATHS.forestIntegrity,
    contextRoute: buildCarbonPuraContextUrl(VIEW_PATHS.forestIntegrity, undefined, {
      sourceSuite: 'LANDVI',
    }),
    routeStatus: 'Route registered in SPA',
    contextBannerStatus: 'Context banner not implemented',
    providerStatus: 'Provider pending',
    evidenceAttachmentStatus: 'Attachment pending',
    verificationNotes:
      'ForestIntegrityPage.tsx has no CarbonPuraContextBanner yet (E2E confirms context route does not crash). Context query params are safe to ignore until banner is added. Scans are operator-initiated inside Forest Integrity.',
    nextAction: 'Add context banner',
    evidenceExportPath: 'Forest Integrity → evidence packet panel (module-native)',
    providerProbeKey: null,
    qaChecklist: qa('forest-integrity'),
  },
  {
    id: 'air-quality',
    moduleName: 'Air Quality / ppm Intelligence',
    nativeRoute: VIEW_PATHS.airQualityMonitor,
    contextRoute: buildCarbonPuraContextUrl(VIEW_PATHS.airQualityMonitor, undefined, {
      sourceSuite: 'AER_UAA',
    }),
    routeStatus: 'Route registered in SPA',
    contextBannerStatus: 'Context banner not implemented',
    providerStatus: 'Needs backend support',
    evidenceAttachmentStatus: 'Attachment pending',
    verificationNotes:
      'Route /air registered. Context link defined for aerosol suite handoff; banner not mounted on air surface (may route via Carbon MRV tab in product copy). Live reads depend on API configuration.',
    nextAction: 'Add context banner',
    evidenceExportPath: 'Air / Carbon MRV air-quality tab → module-native exports',
    providerProbeKey: null,
    qaChecklist: qa('air-quality'),
  },
  {
    id: 'hazardous-waste',
    moduleName: 'Hazardous Waste / Compliance Audit',
    nativeRoute: VIEW_PATHS.hazardousWasteAudit,
    contextRoute: null,
    routeStatus: 'Route registered in SPA',
    contextBannerStatus: 'N/A — no context route',
    providerStatus: 'Needs backend support',
    evidenceAttachmentStatus: 'Attachment pending',
    verificationNotes:
      'Route /hazardous-waste-audit registered. Persistence requires /api/hazardous-waste-audit/* on configured API host — not verified from CarbonPura hub.',
    nextAction: 'Confirm provider on API host',
    evidenceExportPath: 'Hazardous Waste Audit → facility audit export (module-native when API live)',
    providerProbeKey: null,
    qaChecklist: qa('hazardous-waste'),
  },
  {
    id: 'env-hub',
    moduleName: 'Environmental Intelligence Hub',
    nativeRoute: VIEW_PATHS.environmentalIntelligenceHub,
    contextRoute: null,
    routeStatus: 'Route registered in SPA',
    contextBannerStatus: 'N/A — no context route',
    providerStatus: 'Not applicable',
    evidenceAttachmentStatus: 'Attachment pending',
    verificationNotes:
      'Hub entry at /environmental-intelligence — orchestration surface, not a PACE scan engine. Use module launch grid for deep links; no CarbonPura embed.',
    nextAction: 'None — route-only module',
    evidenceExportPath: 'Hub tiles → launch target modules for evidence',
    providerProbeKey: null,
    qaChecklist: qa('env-hub'),
  },
];

export const CARBONPURA_VERIFICATION_DISCLAIMER =
  'Statuses below combine SPA route registration (code audit), documented banner implementation, and Playwright smoke where run. Manual scan tests and backend evidence attachment remain operator/API tasks — not auto-run from CarbonPura.';
