/**
 * Investor demo scenarios for the Environmental Intelligence Hub.
 *
 * Pure data — no auto-actions, no provider calls. Each scenario explains, in
 * plain English, how DPAL moves from location → signal → verification →
 * evidence packet → response. Investor copy is intentionally honest: live data,
 * preview-only flows, and field-validation gates are surfaced as-is.
 *
 * Honored by `EnvironmentalIntelligenceHubView` (scenario cards), and by the
 * shared `InvestorDemoExplainer` / `EvidencePacketPreview` components that the
 * supported modules embed near their Watch / workflow panels.
 */

import type { View } from '../../../../App';

export type DemoScenarioCoordinates = {
  latitude: number;
  longitude: number;
};

/** Honest provider state — mirrors hub probe vocabulary so demo chips never imply live data when it is not. */
export type DemoScenarioSourceTone = 'live' | 'partial' | 'preview' | 'unavailable';

export type DemoScenarioSourceChip = {
  id: string;
  label: string;
  tone: DemoScenarioSourceTone;
};

export type DemoScenario = {
  /** Stable id — used for keys and analytics. */
  id: string;
  /** Investor-facing card title. */
  title: string;
  /** Short module / lane label shown above the title (e.g. "AquaScan", "Forest Integrity"). */
  moduleLabel: string;
  /** Destination DPAL `View` to open from the card. */
  view: View;
  /**
   * `true` if the destination module honors the `#watch` hash by opening / focusing its Watch
   * (or Workflow) panel on arrival. Cards only render the "Watch DPAL Work" CTA when this is true.
   */
  supportsWatchDeepLink: boolean;
  /** Human-readable location label (e.g. "Manila Bay, Philippines"). */
  locationLabel: string;
  /** Optional coordinates for plotting / pre-fill context. */
  coordinates?: DemoScenarioCoordinates;
  /** 1–2 sentence investor pitch — answers "why am I looking at this?". */
  investorExplanation: string;
  /** Concrete checks DPAL runs in this lane (provider lanes, indices, validators). */
  whatDpalChecks: string[];
  /** Provider source chips with honest tone (live/partial/preview/unavailable). */
  providerSources: DemoScenarioSourceChip[];
  /** Bulleted preview of what a finished evidence packet would contain. */
  evidencePacketPreview: string[];
  /** One-line limitation / honesty disclosure. Never omitted. */
  limitationNote: string;
  /** Operator next step after reviewing the scenario. */
  recommendedNextAction: string;
  /** Optional accent — matches `EnvironmentalServiceCard` accent palette. */
  accent?: 'emerald' | 'sky' | 'teal' | 'amber';
};

/**
 * Curated demo scenarios. Adding or removing entries should be a deliberate product decision:
 * each scenario must keep an honest limitation note and must not invent verified results.
 */
export const DEMO_SCENARIOS: DemoScenario[] = [
  {
    id: 'demo-aquascan-cedar-river',
    title: 'Cedar River watershed — turbidity spike review',
    moduleLabel: 'AquaScan Water Intelligence',
    view: 'aquaScanWater',
    supportsWatchDeepLink: true,
    locationLabel: 'Cedar River, Renton, Washington, USA',
    coordinates: { latitude: 47.4837, longitude: -122.21 },
    investorExplanation:
      'A community reports that the Cedar River looks unusually murky after a storm. DPAL maps the area, pulls Copernicus before/after imagery, and prepares an evidence packet that a validator can review.',
    whatDpalChecks: [
      'Focus location, AOI polygon, and saved boundary',
      'Copernicus NDWI / water-presence comparison for the AOI window',
      'Flow-direction and flood-wet overlays when adapters are configured',
      'Local sample history and prior validator notes',
    ],
    providerSources: [
      { id: 'cop', label: 'Copernicus / Sentinel-2 L2A', tone: 'live' },
      { id: 'gibs', label: 'NASA GIBS basemap', tone: 'live' },
      { id: 'usgs', label: 'USGS / NWS hazards', tone: 'partial' },
      { id: 'lab', label: 'Lab partner upload', tone: 'preview' },
    ],
    evidencePacketPreview: [
      'AOI center, polygon vertices, and saved boundary area',
      'NDWI before/after delta and Copernicus comparison metadata',
      'Workflow checklist status (Location · AOI · Layers · Compare · Evidence · Action)',
      'Validator review state and any community / lab notes',
    ],
    limitationNote:
      'Indicative MRV estimate — not a certified carbon credit. Field sampling and validator review are required before any public claim.',
    recommendedNextAction:
      'Open AquaScan, confirm the focus location, draw or load the AOI, and run a Copernicus comparison.',
    accent: 'sky',
  },
  {
    id: 'demo-forest-amazon-aoi',
    title: 'Amazon tributary — deforestation alert investigation',
    moduleLabel: 'Forest Integrity',
    view: 'forestIntegrity',
    supportsWatchDeepLink: true,
    locationLabel: 'Amazonas, Brazil (Madeira tributary)',
    coordinates: { latitude: -3.4653, longitude: -62.2159 },
    investorExplanation:
      'A frontline community sees forest clearing near a tributary. DPAL pulls Global Forest Watch and NASA FIRMS evidence, checks Landsat indices, and prepares an integrity packet — without auto-publishing any finding.',
    whatDpalChecks: [
      'GFW integrated alerts and disturbance / RADD lanes',
      'NASA FIRMS active-fire CSV rows for the AOI window',
      'Landsat C2 L2 NDVI / NDMI / NBR statistics (when scenes resolve)',
      'GEDI biomass / canopy lane status (preview when not implemented)',
    ],
    providerSources: [
      { id: 'gfw', label: 'Global Forest Watch', tone: 'live' },
      { id: 'firms', label: 'NASA FIRMS', tone: 'live' },
      { id: 'landsat', label: 'Landsat C2 L2 (Planetary Computer)', tone: 'partial' },
      { id: 'gedi', label: 'NASA GEDI', tone: 'preview' },
    ],
    evidencePacketPreview: [
      'AOI center, radius, and selected baseline / current date window',
      'GFW alert counts and dataset versions queried',
      'FIRMS hotspot CSV row count and index values per available lane',
      'Forest integrity score with limitations and SHA-256 hash readiness',
    ],
    limitationNote:
      'Data is provided by third-party sources. DPAL does not treat this information alone as a final legal finding or certified carbon-credit determination.',
    recommendedNextAction:
      'Open Forest Integrity, confirm the AOI on the map, and click Watch DPAL Work to walk through provider lanes step by step.',
    accent: 'emerald',
  },
  {
    id: 'demo-plastic-manila-bay',
    title: 'Manila Bay — possible plastic-risk anomaly review',
    moduleLabel: 'Hyperspectral Plastic Watch',
    view: 'hyperspectralPlasticWatch',
    supportsWatchDeepLink: true,
    locationLabel: 'Manila Bay, Philippines',
    coordinates: { latitude: 14.5995, longitude: 120.9842 },
    investorExplanation:
      'A coastal team flags discoloration after a storm. DPAL prepares a hyperspectral screening flow that distinguishes possible plastic-risk anomalies from algae, turbidity, sediment, and glint — without claiming plastic detection from satellite alone.',
    whatDpalChecks: [
      'PACE ocean color and EMIT hyperspectral scene availability',
      'Sentinel / Landsat fallback for broadband context',
      'Spectral risk indicators and water-quality confounders (algae, turbidity, sediment, clouds/glint)',
      'Field validation reminders and drone validation placeholders',
    ],
    providerSources: [
      { id: 'pace', label: 'NASA PACE', tone: 'preview' },
      { id: 'emit', label: 'NASA EMIT', tone: 'preview' },
      { id: 'sentinel', label: 'Sentinel / Landsat fallback', tone: 'partial' },
      { id: 'field', label: 'Field validation', tone: 'partial' },
    ],
    evidencePacketPreview: [
      'AOI center, radius, environment type, and date window',
      'PACE / EMIT / fallback lane status with honest messages',
      'Plastic-risk evidence score (0–100) and risk-level label',
      'Confounder summary and SHA-256 audit hash readiness',
    ],
    limitationNote:
      'Evidence-support only. Satellite spectral anomalies are not final proof of plastic pollution and must be reviewed with field sampling, drone imagery, water-quality context, and independent validation.',
    recommendedNextAction:
      'Open Hyperspectral Plastic Watch, confirm the AOI and environment type, and click Watch DPAL Work to step through PACE / EMIT / fallback lanes.',
    accent: 'sky',
  },
  {
    id: 'demo-carb-epa-richmond',
    title: 'Richmond refinery — CARB / EPA emissions reconciliation',
    moduleLabel: 'CARB / EPA Compliance',
    view: 'carbEmissionsAudit',
    supportsWatchDeepLink: false,
    locationLabel: 'Richmond, California, USA',
    coordinates: { latitude: 37.9358, longitude: -122.3478 },
    investorExplanation:
      'A community asks whether reported CARB emissions match independent EPA / Envirofacts records. DPAL opens the audit workspace, lines up reported vs cross-source data, and drafts a packet for analyst review.',
    whatDpalChecks: [
      'CARB facility, reporting year, and pollutant breakdown lookup',
      'EPA / Envirofacts / GHGRP cross-reference for facility id, NAICS, and address',
      'Reported vs independent value reconciliation and dataset mode (live / imported / preview)',
      'Audit packet draft with validator review reminders',
    ],
    providerSources: [
      { id: 'carb', label: 'CARB facility data', tone: 'partial' },
      { id: 'epa', label: 'EPA Envirofacts / GHGRP', tone: 'live' },
      { id: 'ghgrp', label: 'GHGRP cross-reference', tone: 'live' },
      { id: 'analyst', label: 'Analyst review', tone: 'preview' },
    ],
    evidencePacketPreview: [
      'Selected facility, reporting year, and search context',
      'CARB pollutant totals and gas breakdown with dataset mode',
      'EPA / Envirofacts cross-references and reconciliation flags',
      'Analyst tasks, warnings, and validator review state',
    ],
    limitationNote:
      'Source reconciliation may flag mismatches even when both feeds are healthy. DPAL never asserts a regulatory violation from a single source — analyst review is required.',
    recommendedNextAction:
      'Open the CARB / EPA audit workspace, pick a facility, and run an investigation pass to draft the packet.',
    accent: 'emerald',
  },
  {
    id: 'demo-field-os-flood-response',
    title: 'Field OS Super Agent — coordinated environmental response',
    moduleLabel: 'Field OS · Situation Room',
    view: 'fieldOS',
    supportsWatchDeepLink: false,
    locationLabel: 'Operator-chosen AOI (multi-module coordination)',
    investorExplanation:
      'After an environmental incident, an operator plans a multi-tool response: Earth Observation scan, AquaScan AOI review, Forest / Plastic screening, and a Situation Room handoff. Field OS proposes a plan; humans approve each step.',
    whatDpalChecks: [
      'Super Agent goal interpretation and dry-run plan',
      'Module routing across Earth Observation, AquaScan, Forest, Plastic, CARB / EPA',
      'Evidence packet readiness per module and validator gates',
      'Situation Room collaboration handoff with media controls',
    ],
    providerSources: [
      { id: 'super', label: 'DPAL Super Agent', tone: 'partial' },
      { id: 'navigator', label: 'DPAL Navigator', tone: 'partial' },
      { id: 'situation', label: 'Situation Room', tone: 'live' },
      { id: 'missions', label: 'Missions V2 bridge', tone: 'preview' },
    ],
    evidencePacketPreview: [
      'Goal description and the modules Super Agent would touch',
      'Dry-run results per module with honest live / preview / unavailable lane states',
      'Aggregated evidence-packet readiness summary across modules',
      'Suggested Situation Room thread and mission handoffs (manual approval required)',
    ],
    limitationNote:
      'Field OS Super Agent plans and previews. It does not auto-publish, auto-verify, auto-anchor, auto-route, auto-pay, or auto-escalate without operator approval.',
    recommendedNextAction:
      'Open Field OS, describe the goal in plain English, run a dry plan, and approve each module hand-off before any provider call.',
    accent: 'teal',
  },
];

/** Quick lookup helper. */
export function getDemoScenarioById(id: string): DemoScenario | undefined {
  return DEMO_SCENARIOS.find((s) => s.id === id);
}

/** Tone → light chip class. Matches light panels (e.g. Investor Demo page). */
export function demoSourceToneClass(tone: DemoScenarioSourceTone): string {
  const base = 'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold';
  switch (tone) {
    case 'live':
      return `${base} border-emerald-200 bg-emerald-50 text-emerald-800`;
    case 'partial':
      return `${base} border-amber-200 bg-amber-50 text-amber-800`;
    case 'preview':
      return `${base} border-sky-200 bg-sky-50 text-sky-800`;
    case 'unavailable':
    default:
      return `${base} border-slate-200 bg-slate-50 text-slate-600`;
  }
}

/** Tone → chip class for dark cards (Environmental Intelligence Hub scenario grid). */
export function demoSourceToneClassOnDark(tone: DemoScenarioSourceTone): string {
  const base = 'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold';
  switch (tone) {
    case 'live':
      return `${base} border-emerald-500/45 bg-emerald-500/15 text-emerald-200`;
    case 'partial':
      return `${base} border-amber-500/45 bg-amber-500/12 text-amber-100`;
    case 'preview':
      return `${base} border-sky-500/45 bg-sky-500/12 text-sky-100`;
    case 'unavailable':
    default:
      return `${base} border-slate-600 bg-slate-800/80 text-slate-300`;
  }
}

/** Tone → screen-reader-friendly label. Investor copy stays plain English. */
export function demoSourceToneLabel(tone: DemoScenarioSourceTone): string {
  switch (tone) {
    case 'live':
      return 'Live';
    case 'partial':
      return 'Partial';
    case 'preview':
      return 'Preview';
    case 'unavailable':
    default:
      return 'Not connected';
  }
}
