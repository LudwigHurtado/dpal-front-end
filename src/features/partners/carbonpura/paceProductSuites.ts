import { VIEW_PATHS } from '../../../../utils/appRoutes';
import type {
  PaceProductSuiteStatus,
  PaceSuiteEvidenceRole,
  ProviderSourceLifecycleStatus,
  ProviderSourceStatusEntry,
} from '../../environmentalIntegrity/environmentalIntegrityTypes';
import { buildCarbonPuraContextUrl, CARBONPURA_DEFAULT_PROJECT_ID } from './carbonPuraProjectContext';
import type { HyperspectralPlasticProviderStatusResponse } from '../../hyperspectralPlasticWatch/types';

/** PACE does not directly prove plastic pollution. */
export const PACE_PLASTIC_CONFIDENCE_DISCLAIMER =
  'PACE product supports a plastic-risk confidence layer inside a multi-sensor model and requires confounder review and field validation before strong claims.';

export const PACE_POSITIONING_COPY =
  'PACE provides official NASA ocean-color, reflectance, optical, aerosol, cloud, and biogeochemical products that DPAL uses inside a multi-sensor plastic-risk confidence model.';

export const PACE_PROGRAM_NOTE =
  'NASA public PACE data release began April 2024. Collection/processing Version 3.1 is the current reference; reprocessings and algorithm updates should be expected as calibration improves. DPAL tracks suite, processing level, maturity, quality flags, and uncertainty fields for evidence-ready workflows — not “cool satellite visuals” alone.';

export const PACE_DATA_VERSION_LABEL = 'PACE V3.1 (reference — confirm granule version at retrieval)';

const PLASTIC_WATCH_ROUTE = VIEW_PATHS.hyperspectralPlasticWatch;
const PLASTIC_WATCH_MODULE = 'Hyperspectral Plastic Watch';

type SuiteRouting = {
  recommendedRoute: string;
  recommendedView: string;
  recommendedModuleLabel: string;
  launchPurpose: string;
  evidenceRole: PaceSuiteEvidenceRole;
};

/** Recommended module routing per official PACE product suite (context routing — targets may ignore params). */
export const PACE_SUITE_ROUTING: Record<string, SuiteRouting> = {
  OC_AOP: {
    recommendedRoute: VIEW_PATHS.hyperspectralPlasticWatch,
    recommendedView: 'hyperspectralPlasticWatch',
    recommendedModuleLabel: 'PACE Plastic Watch',
    launchPurpose:
      'Use reflectance / ocean-color context for water-color and plastic-risk confidence review (not standalone plastic proof).',
    evidenceRole: 'confidence layer',
  },
  OC_IOP: {
    recommendedRoute: VIEW_PATHS.aquaScanWater,
    recommendedView: 'aquaScanWater',
    recommendedModuleLabel: 'AquaScan',
    launchPurpose:
      'Use water clarity, absorption, backscatter, and Kd context for turbidity and confounder review.',
    evidenceRole: 'confounder reduction',
  },
  OC_BGC: {
    recommendedRoute: VIEW_PATHS.waterOperationsEngine,
    recommendedView: 'waterOperationsEngine',
    recommendedModuleLabel: 'Water Monitor',
    launchPurpose:
      'Use chlorophyll, POC, phytoplankton carbon, and bloom context for blue-carbon and ecosystem review (Plastic Watch also supports bloom confounders).',
    evidenceRole: 'carbon/ecosystem context',
  },
  MOANA: {
    recommendedRoute: VIEW_PATHS.hyperspectralPlasticWatch,
    recommendedView: 'hyperspectralPlasticWatch',
    recommendedModuleLabel: 'PACE Plastic Watch',
    launchPurpose:
      'Use phytoplankton group context to reduce false positives in plastic-risk screening (coastal limitations apply).',
    evidenceRole: 'confounder reduction',
  },
  PAR: {
    recommendedRoute: VIEW_PATHS.waterOperationsEngine,
    recommendedView: 'waterOperationsEngine',
    recommendedModuleLabel: 'Water Monitor',
    launchPurpose: 'Use photosynthetically available radiation for productivity and bloom/carbon context.',
    evidenceRole: 'carbon/ecosystem context',
  },
  CLDMASK: {
    recommendedRoute: VIEW_PATHS.hyperspectralPlasticWatch,
    recommendedView: 'hyperspectralPlasticWatch',
    recommendedModuleLabel: 'PACE Plastic Watch',
    launchPurpose: 'Use cloud and cloud-adjacent masking as quality control before interpreting PACE signals.',
    evidenceRole: 'quality control layer',
  },
  SFREFL: {
    recommendedRoute: VIEW_PATHS.hyperspectralPlasticWatch,
    recommendedView: 'hyperspectralPlasticWatch',
    recommendedModuleLabel: 'PACE Plastic Watch',
    launchPurpose: 'Use surface reflectance as supporting layer for surface anomaly review.',
    evidenceRole: 'confidence layer',
  },
  LANDVI: {
    recommendedRoute: VIEW_PATHS.forestIntegrity,
    recommendedView: 'forestIntegrity',
    recommendedModuleLabel: 'Forest Integrity',
    launchPurpose: 'Use vegetation indices for forest, biomass, carbon, and land-surface monitoring.',
    evidenceRole: 'carbon/ecosystem context',
  },
  'AER_UAA / UVAI_UAA': {
    recommendedRoute: VIEW_PATHS.airQualityMonitor,
    recommendedView: 'airQualityMonitor',
    recommendedModuleLabel: 'Air Quality Monitor',
    launchPurpose:
      'Use aerosol / smoke / dust context for atmospheric interference and air-quality context.',
    evidenceRole: 'quality control layer',
  },
  'HARP2/SPEXone': {
    recommendedRoute: VIEW_PATHS.hyperspectralPlasticWatch,
    recommendedView: 'hyperspectralPlasticWatch',
    recommendedModuleLabel: 'PACE Plastic Watch',
    launchPurpose:
      'Use polarimetric context for aerosol, glint, cloud, and ocean-surface confounder review (planned lane).',
    evidenceRole: 'confounder reduction',
  },
};

export function getPaceSuiteRouting(suiteCode: string): SuiteRouting {
  return (
    PACE_SUITE_ROUTING[suiteCode] ?? {
      recommendedRoute: PLASTIC_WATCH_ROUTE,
      recommendedView: 'hyperspectralPlasticWatch',
      recommendedModuleLabel: PLASTIC_WATCH_MODULE,
      launchPurpose: 'Open related DPAL engine for PACE evidence-support context.',
      evidenceRole: 'validator support',
    }
  );
}

export function buildPaceSuiteContextHref(suiteCode: string, projectId = CARBONPURA_DEFAULT_PROJECT_ID): string {
  const routing = getPaceSuiteRouting(suiteCode);
  return buildCarbonPuraContextUrl(routing.recommendedRoute, projectId, { sourceSuite: suiteCode });
}

type PaceLaneProbe = {
  status: ProviderSourceLifecycleStatus;
  providerNotes?: string;
};

/** Product-aware one-liners shown in the intelligence layer summary strip. */
export const PACE_PRODUCT_AWARE_SUMMARY: { code: string; label: string }[] = [
  { code: 'OC_AOP', label: 'available for reflectance / water-color screening' },
  { code: 'OC_IOP', label: 'available for water clarity / confounder review' },
  { code: 'OC_BGC', label: 'available for chlorophyll / carbon / ecosystem context' },
  { code: 'MOANA', label: 'available for phytoplankton / bloom confounder context (coastal limits)' },
  { code: 'PAR', label: 'available for productivity / light context' },
  { code: 'CLDMASK', label: 'required for cloud quality screening' },
  { code: 'SFREFL', label: 'available for surface reflectance comparison' },
  { code: 'LANDVI', label: 'available for land / vegetation support' },
  { code: 'AER/UVAI', label: 'available for aerosol / smoke / dust context' },
  { code: 'HARP2/SPEXone', label: 'polarimetric aerosol / ocean / cloud support (planned lane)' },
];

/** Plastic-risk confounder stack — how PACE suites support DPAL checks. */
export const PACE_PLASTIC_CONFOUNDER_STACK = [
  {
    dpalCheck: 'Water color anomaly',
    paceSupport: 'OC_AOP / remote sensing reflectance (Rrs)',
  },
  {
    dpalCheck: 'Suspended sediment / turbidity confounder',
    paceSupport: 'OC_IOP absorption, backscatter, Kd',
  },
  {
    dpalCheck: 'Algae / bloom confounder',
    paceSupport: 'OC_BGC chlorophyll-a · MOANA phytoplankton groups',
  },
  {
    dpalCheck: 'Cloud / glint quality problem',
    paceSupport: 'CLDMASK · aerosol / HARP2-SPEXone polarimetry',
  },
  {
    dpalCheck: 'Surface reflectance comparison',
    paceSupport: 'SFREFL bottom-of-atmosphere reflectance',
  },
  {
    dpalCheck: 'Land / coastal vegetation / wetland context',
    paceSupport: 'LANDVI (NDVI, NDWI, red-edge / pigment indices)',
  },
  {
    dpalCheck: 'Smoke / dust atmospheric issue',
    paceSupport: 'AER_UAA · UVAI_UAA',
  },
] as const;

/** Which PACE product families each CarbonPura-facing module uses. */
export const CARBONPURA_PACE_MODULE_MAP = [
  {
    module: 'Water Intelligence',
    paceProducts: 'OC_AOP, OC_IOP, PAR, CLDMASK',
    route: VIEW_PATHS.waterOperationsEngine,
  },
  {
    module: 'Plastic / PACE Watch',
    paceProducts: 'OC_AOP, OC_IOP, SFREFL, CLDMASK, AER/UVAI, HARP2/SPEXone',
    route: VIEW_PATHS.hyperspectralPlasticWatch,
  },
  {
    module: 'Blue Carbon / Ocean Carbon',
    paceProducts: 'OC_BGC, POC, phytoplankton carbon, chlorophyll-a, PAR',
    route: VIEW_PATHS.carbonMRV,
  },
  {
    module: 'Algae / Harmful Bloom Context',
    paceProducts: 'chlorophyll-a, MOANA, fluorescence, Rrs',
    route: VIEW_PATHS.hyperspectralPlasticWatch,
  },
  {
    module: 'Air / Aerosol Context',
    paceProducts: 'AER_UAA, UVAI_UAA, RemoTAP, FastMAPOL',
    route: VIEW_PATHS.airQualityMonitor,
  },
  {
    module: 'Forest / Vegetation',
    paceProducts: 'LANDVI, NDVI, NDWI, red-edge / chlorophyll indices',
    route: VIEW_PATHS.forestIntegrity,
  },
  {
    module: 'Quality Control',
    paceProducts: 'CLDMASK, cloud-adjacent masks, uncertainty fields',
    route: VIEW_PATHS.hyperspectralPlasticWatch,
  },
] as const;

export const PACE_INTELLIGENCE_LAYERS = [
  {
    id: 'reflectance',
    primarySuiteCode: 'OC_AOP',
    headline: 'Reflectance → Water Color / Plastic Confidence',
    suites: 'OC_AOP (Apparent Optical Properties)',
    detail: 'Remote sensing reflectance, water color, fluorescence — plastic-risk confidence input only with confounder review.',
  },
  {
    id: 'iop',
    primarySuiteCode: 'OC_IOP',
    headline: 'IOP → Water Clarity / Turbidity Confounders',
    suites: 'OC_IOP (Inherent Optical Properties)',
    detail: 'Absorption, backscattering, Kd — turbidity and suspended-material context for plastic and AquaScan workflows.',
  },
  {
    id: 'bgc',
    primarySuiteCode: 'OC_BGC',
    headline: 'BGC / MOANA / PAR → Ocean Carbon / Bloom Context',
    suites: 'OC_BGC · MOANA · PAR',
    detail: 'Chlorophyll, phytoplankton groups, POC, PAR — bloom and blue-carbon context.',
  },
  {
    id: 'qc-atmos',
    primarySuiteCode: 'CLDMASK',
    headline: 'CLDMASK / AER / UVAI → Quality Control / Atmosphere',
    suites: 'CLDMASK · CLD · AER_UAA · UVAI_UAA',
    detail: 'Cloud masking, aerosol and UVAI — false-positive reduction and correction warnings.',
  },
  {
    id: 'land',
    primarySuiteCode: 'LANDVI',
    headline: 'LANDVI / SFREFL → Vegetation / Land Surface',
    suites: 'SFREFL · LANDVI',
    detail: 'Surface reflectance and vegetation indices — forest/biomass and land/water boundary context.',
  },
  {
    id: 'polar',
    primarySuiteCode: 'HARP2/SPEXone',
    headline: 'HARP2 / SPEXone → Polarimetric Context',
    suites: 'RemoTAP · FastMAPOL · cloud polarimetry',
    detail: 'Aerosol, glint, and ocean/air correction confidence — planned/future DPAL lane.',
  },
] as const;

type SuiteTemplate = Omit<
  PaceProductSuiteStatus,
  | 'status'
  | 'reason'
  | 'providerNotes'
  | 'lastRetrievalDate'
  | 'recommendedRoute'
  | 'recommendedView'
  | 'recommendedModuleLabel'
  | 'launchPurpose'
  | 'evidenceRole'
> & {
  id: string;
  partialReason: string;
  metadataReason: string;
  unavailableReason: string;
};

function resolveSuite(
  plasticError: string | null,
  paceProbe: PaceLaneProbe,
  tpl: SuiteTemplate,
  checkedAtIso: string,
): PaceProductSuiteStatus {
  let status: ProviderSourceLifecycleStatus;
  let reason: string;

  if (plasticError) {
    status = 'unavailable';
    reason = `${tpl.unavailableReason} Plastic Watch provider-status call failed: ${plasticError}.`;
  } else if (paceProbe.status === 'partial') {
    status = 'partial';
    reason = `${tpl.partialReason} DPAL Plastic Watch lane is configured; per-suite NASA L2 granule retrieval is not yet automated from CarbonPura — status is partial but product-aware.`;
  } else if (paceProbe.status === 'metadata_only') {
    status = 'metadata_only';
    reason = `${tpl.metadataReason} PACE lane reports readiness/metadata only on this API host.`;
  } else {
    status = 'unavailable';
    reason = tpl.unavailableReason;
  }

  const routing = getPaceSuiteRouting(tpl.suiteCode);

  return {
    suiteCode: tpl.suiteCode,
    suiteName: tpl.suiteName,
    instrument: tpl.instrument,
    processingLevel: tpl.processingLevel,
    maturityLevel: tpl.maturityLevel,
    domain: tpl.domain,
    status,
    reason,
    currentCapability: tpl.currentCapability,
    carbonPuraUse: tpl.carbonPuraUse,
    qualityFlagsRequired: tpl.qualityFlagsRequired,
    uncertaintyAvailable: tpl.uncertaintyAvailable,
    missingForFullLive: tpl.missingForFullLive,
    relatedModule: tpl.relatedModule,
    route: routing.recommendedRoute,
    recommendedRoute: routing.recommendedRoute,
    recommendedView: routing.recommendedView,
    recommendedModuleLabel: routing.recommendedModuleLabel,
    launchPurpose: routing.launchPurpose,
    evidenceRole: routing.evidenceRole,
    evidenceUse: tpl.evidenceUse,
    confidenceUse: tpl.confidenceUse,
    availabilitySummary: tpl.availabilitySummary,
    providerNotes: paceProbe.providerNotes,
    lastRetrievalDate: plasticError ? undefined : checkedAtIso,
    paceDataVersion: PACE_DATA_VERSION_LABEL,
  };
}

const OCI_SUITE_TEMPLATES: SuiteTemplate[] = [
  {
    id: 'pace-oc-aop',
    suiteCode: 'OC_AOP',
    suiteName: 'Ocean Color Apparent Optical Properties',
    instrument: 'OCI',
    processingLevel: 'L2',
    maturityLevel: 'NASA standard suite · DPAL partial (metadata + scan context)',
    domain: 'Ocean / Water',
    availabilitySummary: 'available for reflectance / water-color screening',
    partialReason:
      'Official OC_AOP supports remote sensing reflectance, water color, fluorescence, apparent visible wavelength, and atmospheric-correction context. ',
    metadataReason: 'OC_AOP documented; PACE lane not fully enabled for live granule reads. ',
    unavailableReason: 'PACE OC_AOP not configured on this API deployment. ',
    currentCapability: 'Rrs / water-color context in Plastic Watch when operator runs scan — not hub-automated granule pull',
    carbonPuraUse: 'water color anomaly, bloom context, plastic-risk confidence input',
    qualityFlagsRequired: 'cloud mask, glint, atmospheric correction quality, adjacency',
    uncertaintyAvailable: false,
    missingForFullLive: 'live granule retrieval, Rrs extraction, fluorescence in evidence packet, project attachment',
    relatedModule: PLASTIC_WATCH_MODULE,
    route: PLASTIC_WATCH_ROUTE,
    evidenceUse: 'supports confidence layer, not final plastic proof',
    confidenceUse: 'Water color anomaly screening — ' + PACE_PLASTIC_CONFIDENCE_DISCLAIMER,
  },
  {
    id: 'pace-oc-iop',
    suiteCode: 'OC_IOP',
    suiteName: 'Ocean Color Inherent Optical Properties',
    instrument: 'OCI',
    processingLevel: 'L2',
    maturityLevel: 'NASA standard suite · DPAL partial',
    domain: 'Ocean / Water',
    availabilitySummary: 'available for water clarity / confounder review',
    partialReason: 'OC_IOP covers absorption, backscatter, Kd, water clarity, and suspended material. ',
    metadataReason: 'OC_IOP readiness tied to metadata lane only. ',
    unavailableReason: 'OC_IOP not reachable. ',
    currentCapability: 'turbidity/confounder documentation — IOP fields not auto-pulled per suite from hub',
    carbonPuraUse: 'turbidity and confounder checking for water/plastic scans',
    qualityFlagsRequired: 'cloud mask, atmospheric correction flags, turbidity, CDOM',
    uncertaintyAvailable: false,
    missingForFullLive: 'live IOP reader, Kd maps in evidence, AquaScan cross-link',
    relatedModule: 'AquaScan · Plastic Watch',
    route: VIEW_PATHS.aquaScanWater,
    evidenceUse: 'confounder appendix — not plastic proof',
    confidenceUse: 'Explains turbidity vs plastic — ' + PACE_PLASTIC_CONFIDENCE_DISCLAIMER,
  },
  {
    id: 'pace-oc-bgc',
    suiteCode: 'OC_BGC',
    suiteName: 'Ocean Color Biogeochemical Properties',
    instrument: 'OCI',
    processingLevel: 'L2',
    maturityLevel: 'NASA standard suite · DPAL partial',
    domain: 'Ocean / Carbon',
    availabilitySummary: 'available for chlorophyll / carbon / ecosystem context',
    partialReason: 'OC_BGC provides chlorophyll-a, phytoplankton carbon, and POC. ',
    metadataReason: 'OC_BGC in intelligence layer; live fields not hub-exposed. ',
    unavailableReason: 'OC_BGC unavailable. ',
    currentCapability: 'ecosystem / bloom context in documentation and module-native scans',
    carbonPuraUse: 'blue carbon / ocean carbon, algae/bloom confounder context',
    qualityFlagsRequired: 'bloom, CDOM, case-2 water, cloud',
    uncertaintyAvailable: false,
    missingForFullLive: 'live chlorophyll/POC extraction, blue-carbon evidence attachment',
    relatedModule: 'Carbon MRV · Plastic Watch',
    route: VIEW_PATHS.carbonMRV,
    evidenceUse: 'ocean health / bloom context in environmental packets',
    confidenceUse: 'Algae/bloom confounder — not plastic proof',
  },
  {
    id: 'pace-oc-moana',
    suiteCode: 'MOANA',
    suiteName: 'MOANA Phytoplankton Group Abundance',
    instrument: 'OCI',
    processingLevel: 'L2',
    maturityLevel: 'NASA standard suite · DPAL partial · coastal limitations',
    domain: 'Ocean / Biology',
    availabilitySummary: 'available for phytoplankton / bloom confounder context (coastal limits)',
    partialReason:
      'MOANA supports phytoplankton group abundance for bloom/confounder intelligence. Limitations in optically complex coastal waters. ',
    metadataReason: 'MOANA documented with coastal caveat. ',
    unavailableReason: 'MOANA not configured. ',
    currentCapability: 'plankton/ecosystem narrative — not automated MOANA classification in hub',
    carbonPuraUse: 'plankton/ecosystem and bloom/confounder intelligence',
    qualityFlagsRequired: 'case-2 water, sediment, shallow bottom, coastal adjacency',
    uncertaintyAvailable: false,
    missingForFullLive: 'live group retrieval, coastal validity flags, evidence fields',
    relatedModule: PLASTIC_WATCH_MODULE,
    route: PLASTIC_WATCH_ROUTE,
    evidenceUse: 'bloom vs debris context — label coastal limitations',
    confidenceUse: 'Phytoplankton confounder — ' + PACE_PLASTIC_CONFIDENCE_DISCLAIMER,
  },
  {
    id: 'pace-oc-par',
    suiteCode: 'PAR',
    suiteName: 'Photosynthetically Available Radiation',
    instrument: 'OCI',
    processingLevel: 'L2',
    maturityLevel: 'NASA standard suite · DPAL partial',
    domain: 'Ocean / Productivity',
    availabilitySummary: 'available for productivity / light context',
    partialReason: 'PAR supports primary productivity and bloom/carbon context. ',
    metadataReason: 'PAR listed in intelligence layer only. ',
    unavailableReason: 'PAR lane not available. ',
    currentCapability: 'productivity/bloom context in documentation',
    carbonPuraUse: 'primary productivity and bloom/carbon context',
    qualityFlagsRequired: 'cloud, ice, twilight',
    uncertaintyAvailable: false,
    missingForFullLive: 'live PAR time series in project evidence',
    relatedModule: 'Water Intelligence · Carbon MRV',
    route: VIEW_PATHS.waterOperationsEngine,
    evidenceUse: 'bloom timing supporting context',
    confidenceUse: 'Ancillary to plastic-risk layer',
  },
  {
    id: 'pace-oc-cld',
    suiteCode: 'CLDMASK',
    suiteName: 'Cloud Mask / Cloud Properties',
    instrument: 'OCI',
    processingLevel: 'L2',
    maturityLevel: 'NASA standard suite · DPAL partial',
    domain: 'Quality Control',
    availabilitySummary: 'required for cloud quality screening',
    partialReason: 'CLDMASK/CLD required for QC and false-positive reduction. ',
    metadataReason: 'Cloud QC documented; automated mask not hub-wired. ',
    unavailableReason: 'Cloud products not reachable. ',
    currentCapability: 'QC guidance in Plastic Watch confounder panels',
    carbonPuraUse: 'quality control and false-positive reduction',
    qualityFlagsRequired: 'cloud, cloud adjacency, cloud shadow, uncertainty fields',
    uncertaintyAvailable: true,
    missingForFullLive: 'automated cloud mask on map, QC flags in evidence export',
    relatedModule: PLASTIC_WATCH_MODULE,
    route: PLASTIC_WATCH_ROUTE,
    evidenceUse: 'QC section — cloud-contaminated scenes flagged',
    confidenceUse: 'Mandatory gate before water-color or plastic-risk interpretation',
  },
  {
    id: 'pace-oc-sfrefl',
    suiteCode: 'SFREFL',
    suiteName: 'Surface Reflectance',
    instrument: 'OCI',
    processingLevel: 'L2',
    maturityLevel: 'NASA standard suite · DPAL partial',
    domain: 'Land / Water Surface',
    availabilitySummary: 'available for surface reflectance comparison',
    partialReason: 'SFREFL supports bottom-of-atmosphere surface reflectance for land/water analysis. ',
    metadataReason: 'SFREFL in intelligence map only. ',
    unavailableReason: 'SFREFL not configured. ',
    currentCapability: 'land/water boundary context — not PACE SFREFL granules from hub',
    carbonPuraUse: 'land/water surface analysis, vegetation/plastic-risk support',
    qualityFlagsRequired: 'land adjacency, sunglint, topography shadow',
    uncertaintyAvailable: false,
    missingForFullLive: 'PACE SFREFL granule access, AOI fusion',
    relatedModule: PLASTIC_WATCH_MODULE,
    route: PLASTIC_WATCH_ROUTE,
    evidenceUse: 'surface reflectance in multi-sensor narrative',
    confidenceUse: PACE_PLASTIC_CONFIDENCE_DISCLAIMER,
  },
  {
    id: 'pace-oc-landvi',
    suiteCode: 'LANDVI',
    suiteName: 'Land Vegetation Indices',
    instrument: 'OCI',
    processingLevel: 'L2',
    maturityLevel: 'NASA standard suite · DPAL partial',
    domain: 'Land / Vegetation',
    availabilitySummary: 'available for land / vegetation support',
    partialReason: 'LANDVI provides NDVI, NDWI, red-edge and pigment-style indices. ',
    metadataReason: 'LANDVI documented; forest paths may use Landsat/Sentinel separately. ',
    unavailableReason: 'LANDVI not wired. ',
    currentCapability: 'cross-link Forest Integrity — not automated PACE LANDVI granules',
    carbonPuraUse: 'forest/biomass/carbon project monitoring',
    qualityFlagsRequired: 'cloud, snow, burn scar, aerosol',
    uncertaintyAvailable: false,
    missingForFullLive: 'PACE LANDVI pipeline, carbon AOI attachment',
    relatedModule: 'Forest Integrity',
    route: VIEW_PATHS.forestIntegrity,
    evidenceUse: 'forest/biomass supporting layer',
    confidenceUse: 'Vegetation screening — not plastic determinant',
  },
  {
    id: 'pace-oc-aer',
    suiteCode: 'AER_UAA / UVAI_UAA',
    suiteName: 'Aerosol Optical Properties / UVAI',
    instrument: 'OCI',
    processingLevel: 'L2',
    maturityLevel: 'NASA standard suite · DPAL partial',
    domain: 'Atmosphere / Air',
    availabilitySummary: 'available for aerosol / smoke / dust context',
    partialReason: 'AER/UVAI support smoke, dust, and atmospheric correction warnings. ',
    metadataReason: 'Aerosol suites in QC layer; not hub-polled live. ',
    unavailableReason: 'Aerosol lane unavailable. ',
    currentCapability: 'atmospheric warnings in confounder copy; Air module for ambient reads',
    carbonPuraUse: 'smoke/dust/air-quality context and correction warnings',
    qualityFlagsRequired: 'heavy aerosol, smoke plumes, dust, atmospheric correction',
    uncertaintyAvailable: true,
    missingForFullLive: 'live aerosol/UVAI maps in QC strip',
    relatedModule: 'Plastic Watch · Air Quality',
    route: VIEW_PATHS.airQualityMonitor,
    evidenceUse: 'atmospheric QC appendix',
    confidenceUse: 'Reduces false water-color anomalies',
  },
];

function buildPolarimetricSuite(
  plastic: HyperspectralPlasticProviderStatusResponse | null,
  plasticError: string | null,
  paceProbe: PaceLaneProbe,
  checkedAtIso: string,
): PaceProductSuiteStatus {
  const status: ProviderSourceLifecycleStatus = plasticError
    ? 'unavailable'
    : plastic?.earthObservationLive
      ? 'future'
      : 'planned';

  const routing = getPaceSuiteRouting('HARP2/SPEXone');

  return {
    suiteCode: 'HARP2/SPEXone',
    suiteName: 'Polarimetric Aerosol / Ocean / Cloud Products',
    instrument: 'HARP2 · SPEXone',
    processingLevel: 'L2',
    maturityLevel: plastic?.earthObservationLive ? 'NASA products · DPAL lane future' : 'Planned',
    domain: 'Atmosphere / Ocean QC',
    status,
    reason: plasticError
      ? `Polarimetric products unavailable: ${plasticError}`
      : plastic?.earthObservationLive
        ? 'RemoTAP, FastMAPOL, cloud polarimetry on roadmap; not first-class in Plastic Watch UI yet.'
        : 'HARP2/SPEXone polarimetric lanes planned for glint/confounder review.',
    currentCapability: 'documented in intelligence layer — polarimetry when lane ships',
    carbonPuraUse: 'aerosol context, glint/confounder review, ocean/air correction confidence',
    qualityFlagsRequired: 'glint, foam, polarimetric cloud mask, uncertainty fields',
    uncertaintyAvailable: false,
    missingForFullLive: 'polarimetry readers, glint UI, hub endpoint, evidence block',
    relatedModule: PLASTIC_WATCH_MODULE,
    route: routing.recommendedRoute,
    recommendedRoute: routing.recommendedRoute,
    recommendedView: routing.recommendedView,
    recommendedModuleLabel: routing.recommendedModuleLabel,
    launchPurpose: routing.launchPurpose,
    evidenceRole: routing.evidenceRole,
    evidenceUse: 'future QC / confounder appendix',
    confidenceUse: 'Polarimetric confounder context — ' + PACE_PLASTIC_CONFIDENCE_DISCLAIMER,
    availabilitySummary: 'polarimetric aerosol / ocean / cloud support (planned lane)',
    providerNotes: [paceProbe.providerNotes, plastic?.notes?.join(' · ')].filter(Boolean).join(' — ') || undefined,
    lastRetrievalDate: plasticError ? undefined : checkedAtIso,
    paceDataVersion: PACE_DATA_VERSION_LABEL,
  };
}

export function buildPaceProductSuiteStatuses(
  plasticError: string | null,
  plastic: HyperspectralPlasticProviderStatusResponse | null,
  checkedAtIso: string,
): PaceProductSuiteStatus[] {
  const paceProbe: PaceLaneProbe = (() => {
    if (!plastic) return { status: 'unavailable' };
    const pace = plastic.pace;
    const notes = [pace?.message, plastic.notes?.length ? plastic.notes.join(' · ') : null]
      .filter(Boolean)
      .join(' — ');
    if (pace?.configured && pace?.enabled) return { status: 'partial', providerNotes: notes || pace.message };
    if (pace?.configured) return { status: 'metadata_only', providerNotes: notes || pace.message };
    return { status: 'unavailable', providerNotes: notes || pace?.message };
  })();

  return [
    ...OCI_SUITE_TEMPLATES.map((tpl) => resolveSuite(plasticError, paceProbe, tpl, checkedAtIso)),
    buildPolarimetricSuite(plastic, plasticError, paceProbe, checkedAtIso),
  ];
}

/** Map canonical PACE suite status → provider matrix row (grouped naming). */
export function toProviderSourceStatusEntry(
  suite: PaceProductSuiteStatus,
  checkedAtIso?: string,
): ProviderSourceStatusEntry {
  const instrumentLabel = suite.instrument === 'OCI' ? 'OCI' : 'HARP2/SPEXone';
  const shortLabel =
    suite.suiteCode === 'OC_AOP'
      ? 'Reflectance'
      : suite.suiteCode === 'OC_IOP'
        ? 'Water Clarity'
        : suite.suiteCode === 'OC_BGC'
          ? 'Ocean Carbon / Chlorophyll'
          : suite.suiteCode === 'MOANA'
            ? 'Phytoplankton Groups'
            : suite.suiteCode === 'PAR'
              ? 'Productivity Light'
              : suite.suiteCode === 'CLDMASK'
                ? 'Quality Control'
                : suite.suiteCode === 'SFREFL'
                  ? 'Surface Reflectance'
                  : suite.suiteCode === 'LANDVI'
                    ? 'Vegetation Indices'
                    : suite.suiteCode === 'AER_UAA / UVAI_UAA'
                      ? 'Aerosol Context'
                      : 'Polarimetric Aerosol/Ocean Context';

  return {
    id: `pace-${suite.suiteCode.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    sourceName: `NASA PACE / ${instrumentLabel} — ${suite.suiteCode} ${shortLabel}`,
    category: `PACE · ${suite.suiteCode}`,
    status: suite.status,
    reason: suite.reason,
    currentCapability: suite.currentCapability,
    missingForFullLive: suite.missingForFullLive,
    relatedModule: suite.relatedModule,
    route: suite.recommendedRoute,
    recommendedRoute: suite.recommendedRoute,
    recommendedView: suite.recommendedView,
    recommendedModuleLabel: suite.recommendedModuleLabel,
    launchPurpose: suite.launchPurpose,
    evidenceRole: suite.evidenceRole,
    providerNotes: suite.providerNotes,
    confidenceUse: suite.confidenceUse,
    productSuiteCode: suite.suiteCode,
    sourceSuiteCode: suite.suiteCode,
    instrument: suite.instrument === 'OCI' ? 'PACE OCI' : suite.instrument,
    maturityLevel: suite.maturityLevel,
    qualityFlagsRequired: suite.qualityFlagsRequired,
    evidenceUse: suite.evidenceUse,
    matrixGroup: 'pace',
    availabilitySummary: suite.availabilitySummary,
    processingLevel: suite.processingLevel,
    domain: suite.domain,
    carbonPuraUse: suite.carbonPuraUse,
    uncertaintyAvailable: suite.uncertaintyAvailable,
    paceDataVersion: suite.paceDataVersion,
    lastRetrievalDate: suite.lastRetrievalDate ?? checkedAtIso,
    checkedAtIso,
  };
}

export function buildPaceProductSuiteRows(
  plasticError: string | null,
  plastic: HyperspectralPlasticProviderStatusResponse | null,
  checkedAtIso?: string,
): ProviderSourceStatusEntry[] {
  const iso = checkedAtIso ?? new Date().toISOString();
  return buildPaceProductSuiteStatuses(plasticError, plastic, iso).map((s) =>
    toProviderSourceStatusEntry(s, iso),
  );
}

export function isPaceMatrixEntry(source: ProviderSourceStatusEntry): boolean {
  return source.matrixGroup === 'pace' || source.category.startsWith('PACE ·');
}

export function paceStatusDisplayLabel(status: ProviderSourceLifecycleStatus): string {
  if (status === 'partial') return 'Partial · product-aware';
  if (status === 'metadata_only') return 'Metadata only · product-aware';
  return status.replace('_', ' ');
}
