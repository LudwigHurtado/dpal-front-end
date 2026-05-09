/**
 * DPAL Navigator — guided flow engine
 * ----------------------------------------------------------------------------
 * Combines the parser + interpreter outputs into a `GuidedFlow` describing:
 *   - the recommended DPAL module
 *   - a short plain-language explanation
 *   - a step checklist
 *   - mandatory safety warnings (human approval, etc.)
 *   - query params to pass forward when the user opens the module
 *
 * Phase 1 supports a fully wired Coordinate-to-Water-Alert flow. Other
 * scenarios return safe, honest defaults that route to existing modules.
 */
import { parseCoordinates, extractAddressHint } from "./coordinateParser";
import { detectScenario, scenarioLabel } from "./scenarioInterpreter";
import type {
  GuidedFlow,
  GuidedStep,
  NavigatorInterpretation,
  RecommendedModule,
  SafetyWarning,
  ScenarioType,
} from "./types";

/**
 * Stable in-app routes used by the engine. We reference existing routes only
 * — we do not create new top-level paths in Phase 1.
 */
const ROUTES = {
  waterAlertEvidence: "/water-intelligence/water-alert-evidence",
  aquaScan: "/water/aquascan",
  waterMonitor: "/water",
  floodGuard: "/floodguard",
  envirofacts: "/environmental-intelligence/envirofacts-map",
  hazardousWaste: "/hazardous-waste-audit",
  carbEmissions: "/carb-emissions-audit",
  carbonMRV: "/carbon",
  earthObservation: "/earth-observation",
  ledger: "/transparency-db",
  helpCenter: "/help",
  validatorReports: "/report-dashboard",
  reportNew: "/report/new",
  locator: "/locator",
  goodWheels: "/good-wheels",
  globalSignals: "/global-signals",
} as const;

/** Standard human-approval warnings DPAL must always show. */
const STANDARD_SAFETY_WARNINGS: SafetyWarning[] = [
  {
    id: "no-auto-publish",
    level: "block",
    message:
      "DPAL Navigator never auto-publishes a public claim, anchors to blockchain, or marks evidence as human verified. Final actions require human approval.",
  },
];

const DEGRADED_NOTE: SafetyWarning = {
  id: "degraded-aware",
  level: "advise",
  message:
    "If a packet is marked degraded, treat it as observed/draft only. One or more providers may be unavailable.",
};

/**
 * Generates a stable opaque flow id (timestamp + random) so the helper card
 * can recognize a single Navigator session across multiple route changes.
 */
function makeFlowId(): string {
  const t = Date.now().toString(36);
  const r = Math.random().toString(36).slice(2, 8);
  return `nav-${t}-${r}`;
}

interface BuildContext {
  hasCoords: boolean;
  lat: number | null;
  lng: number | null;
  rawInput: string;
}

/** Helper to attach lat/lng + Navigator provenance to query params. */
function buildQueryParams(ctx: BuildContext, flowKey: string): Record<string, string> {
  const params: Record<string, string> = {
    navigatorFlow: flowKey,
    source: "dpal-navigator",
  };
  if (ctx.hasCoords && ctx.lat != null && ctx.lng != null) {
    params.lat = String(ctx.lat);
    params.lng = String(ctx.lng);
  }
  return params;
}

/* ----------------------------- builders ----------------------------------- */

function buildWaterFlowFlow(ctx: BuildContext): GuidedFlow {
  const recommended: RecommendedModule = {
    id: "water-alert-evidence",
    label: "Water Alert Evidence Packet",
    description:
      "Combines FloodGuard, USGS gauges, NWS alerts, and GeoLedger location identity for the chosen coordinates.",
    routeTarget: ROUTES.waterAlertEvidence,
  };
  const steps: GuidedStep[] = [
    { id: "confirm-location", title: "Confirm the location and label", emphasis: "info" },
    {
      id: "review-module-health",
      title: "Review FloodGuard, USGS, NWS, and GeoLedger module health",
      emphasis: "recommended",
    },
    {
      id: "check-status",
      title: "Check whether the packet is OK, degraded, or error",
      helperText: "Degraded packets remain observational — they are not certified evidence.",
      emphasis: "info",
    },
    { id: "generate-packet", title: "Generate or review the evidence packet", emphasis: "info" },
    {
      id: "stop-for-review",
      title: "Stop for human review before public claims or blockchain anchoring",
      emphasis: "warning",
    },
  ];
  const queryParams = buildQueryParams(ctx, "water-alert");
  return {
    scenarioType: "water_flood",
    confidence: ctx.hasCoords ? 0.9 : 0.7,
    title: "Water / Flood Investigation",
    explanation:
      "DPAL can start by checking this location for water risk, alerts, module health, and evidence packet readiness.",
    recommendedModule: recommended,
    routeTarget: recommended.routeTarget,
    nextBestAction:
      "Start by generating or reviewing a Water Alert Evidence Packet for the selected coordinates.",
    steps,
    safetyWarnings: [...STANDARD_SAFETY_WARNINGS, DEGRADED_NOTE],
    queryParams,
    alternateModules: [
      {
        id: "aquascan",
        label: "AquaScan",
        description: "Location-first water command center with map, intelligence panel, and tabs.",
        routeTarget: ROUTES.aquaScan,
      },
      {
        id: "floodguard",
        label: "FloodGuard",
        description: "Verified civic flood intelligence dashboard.",
        routeTarget: ROUTES.floodGuard,
      },
    ],
  };
}

function buildPollutionFlow(ctx: BuildContext): GuidedFlow {
  const recommended: RecommendedModule = {
    id: "envirofacts",
    label: "Envirofacts Geo Intelligence",
    description: "EPA Envirofacts facility lookup and map for pollution and emissions investigation.",
    routeTarget: ROUTES.envirofacts,
  };
  const steps: GuidedStep[] = [
    { id: "describe-concern", title: "Describe the concern in your own words", emphasis: "info" },
    {
      id: "open-envirofacts",
      title: "Open Envirofacts to look up nearby regulated facilities",
      emphasis: "recommended",
    },
    {
      id: "review-hazardous",
      title: "Cross-check Hazardous Waste Integrity Audit if waste/dumping is involved",
      emphasis: "info",
    },
    {
      id: "save-evidence",
      title: "Save findings to the evidence packet — do not publish yet",
      emphasis: "warning",
    },
  ];
  return {
    scenarioType: "pollution_waste",
    confidence: ctx.hasCoords ? 0.85 : 0.7,
    title: "Pollution / Waste Investigation",
    explanation:
      "DPAL can help you research nearby regulated facilities and hazardous waste records before filing a report.",
    recommendedModule: recommended,
    routeTarget: recommended.routeTarget,
    nextBestAction:
      "Open Envirofacts Geo Intelligence and look up regulated facilities near the location.",
    steps,
    safetyWarnings: STANDARD_SAFETY_WARNINGS,
    queryParams: buildQueryParams(ctx, "pollution"),
    alternateModules: [
      {
        id: "hazardous-waste",
        label: "Hazardous Waste Integrity Audit",
        description: "Audit hazardous-waste manifests and disposal records.",
        routeTarget: ROUTES.hazardousWaste,
      },
      {
        id: "carb-emissions",
        label: "CARB / Emissions Audit",
        description: "Mandatory reporting + pollution mapping cross-check (US/CA scope).",
        routeTarget: ROUTES.carbEmissions,
      },
    ],
  };
}

function buildCarbonLandFlow(ctx: BuildContext): GuidedFlow {
  const recommended: RecommendedModule = {
    id: "carbon-mrv",
    label: "Carbon MRV Engine",
    description: "Register projects, run satellite scans, and compute MRV scores for carbon and land projects.",
    routeTarget: ROUTES.carbonMRV,
  };
  const steps: GuidedStep[] = [
    { id: "describe-land", title: "Describe the land / forest / project area", emphasis: "info" },
    {
      id: "earth-observation",
      title: "Run an Earth Observation NDVI / NBR scan if you have coordinates",
      emphasis: "recommended",
    },
    { id: "open-mrv", title: "Open Carbon MRV Engine and check or register the project" },
    {
      id: "stop-for-claim",
      title: "Stop for human MRV review before claiming any carbon offset value",
      emphasis: "warning",
    },
  ];
  return {
    scenarioType: "carbon_land",
    confidence: ctx.hasCoords ? 0.85 : 0.65,
    title: "Carbon / Land Investigation",
    explanation:
      "DPAL can help you check whether a land or carbon project has supporting satellite evidence and a registered MRV record.",
    recommendedModule: recommended,
    routeTarget: recommended.routeTarget,
    nextBestAction:
      "Run an Earth Observation scan for the AOI, then review or register the project in Carbon MRV.",
    steps,
    safetyWarnings: STANDARD_SAFETY_WARNINGS,
    queryParams: buildQueryParams(ctx, "carbon-land"),
    alternateModules: [
      {
        id: "earth-observation",
        label: "Earth Observation",
        description: "AOI-based NDVI / NBR / NDMI / NDWI screening.",
        routeTarget: ROUTES.earthObservation,
      },
    ],
  };
}

function buildPublicReportFlow(ctx: BuildContext): GuidedFlow {
  const recommended: RecommendedModule = {
    id: "report-new",
    label: "Accountability Report Builder",
    description: "Start a new structured public-accountability report with optional evidence packet.",
    routeTarget: ROUTES.reportNew,
  };
  const steps: GuidedStep[] = [
    { id: "draft-report", title: "Start a draft report — do not publish yet", emphasis: "info" },
    {
      id: "attach-evidence",
      title: "Attach photos, coordinates, and any supporting context",
      emphasis: "recommended",
    },
    { id: "ledger-check", title: "Search the public Evidence Ledger for related records" },
    {
      id: "wait-for-review",
      title: "Wait for human/validator review before treating the record as verified",
      emphasis: "warning",
    },
  ];
  return {
    scenarioType: "public_report",
    confidence: 0.7,
    title: "Public Accountability Report",
    explanation:
      "DPAL can help you build a structured report and attach evidence. Reports stay as drafts until reviewed.",
    recommendedModule: recommended,
    routeTarget: recommended.routeTarget,
    nextBestAction: "Open the report builder and start a new draft.",
    steps,
    safetyWarnings: STANDARD_SAFETY_WARNINGS,
    queryParams: buildQueryParams(ctx, "public-report"),
    alternateModules: [
      {
        id: "ledger",
        label: "Evidence Ledger",
        description: "Browse the public DPAL accountability ledger.",
        routeTarget: ROUTES.ledger,
      },
      {
        id: "validator",
        label: "Validator / Report Dashboard",
        description: "Operational queue used by validators and reviewers.",
        routeTarget: ROUTES.validatorReports,
      },
    ],
  };
}

function buildLocatorFlow(ctx: BuildContext): GuidedFlow {
  const recommended: RecommendedModule = {
    id: "locator",
    label: "DPAL Locator",
    description: "Public locator surface for missing pets, items, and people.",
    routeTarget: ROUTES.locator,
  };
  const steps: GuidedStep[] = [
    { id: "describe", title: "Describe what is missing and where it was last seen", emphasis: "info" },
    { id: "add-coords", title: "Add coordinates if available", emphasis: "recommended" },
    { id: "publish-locator", title: "Publish to DPAL Locator only after reviewing the post" },
  ];
  return {
    scenarioType: "locator",
    confidence: 0.7,
    title: "Missing Item / Pet / Person",
    explanation:
      "DPAL Locator is the right place for missing pets, items, and people. Posts remain user-controlled.",
    recommendedModule: recommended,
    routeTarget: recommended.routeTarget,
    nextBestAction: "Open DPAL Locator and create a post for the missing item.",
    steps,
    safetyWarnings: STANDARD_SAFETY_WARNINGS,
    queryParams: buildQueryParams(ctx, "locator"),
  };
}

function buildTransportFlow(ctx: BuildContext): GuidedFlow {
  const recommended: RecommendedModule = {
    id: "good-wheels",
    label: "Good Wheels",
    description: "DPAL Lifts — community ride / pickup coordination.",
    routeTarget: ROUTES.goodWheels,
  };
  const steps: GuidedStep[] = [
    { id: "describe", title: "Describe pickup, drop-off, and timing", emphasis: "info" },
    { id: "open-good-wheels", title: "Open Good Wheels", emphasis: "recommended" },
    {
      id: "human-confirm",
      title: "Confirm trip details with the driver before paying or moving",
      emphasis: "warning",
    },
  ];
  return {
    scenarioType: "transport_help",
    confidence: 0.7,
    title: "Transport / Help Request",
    explanation: "DPAL Lifts (Good Wheels) coordinates community rides and pickups.",
    recommendedModule: recommended,
    routeTarget: recommended.routeTarget,
    nextBestAction: "Open Good Wheels and start a ride request.",
    steps,
    safetyWarnings: STANDARD_SAFETY_WARNINGS,
    queryParams: buildQueryParams(ctx, "good-wheels"),
  };
}

function buildUnknownFlow(ctx: BuildContext): GuidedFlow {
  const recommended: RecommendedModule = {
    id: "global-signals",
    label: "DPAL Global Signals",
    description:
      "Live USGS / NASA EONET / OpenAQ feeds — useful when you only have coordinates and no clear category yet.",
    routeTarget: ROUTES.globalSignals,
  };
  const steps: GuidedStep[] = [
    {
      id: "pick-path",
      title:
        "Pick a path: scan a location, create a report, upload evidence, or open the map",
      emphasis: "recommended",
    },
    {
      id: "refine",
      title: "Refine the description so DPAL can match the right module",
      emphasis: "info",
    },
  ];
  return {
    scenarioType: "unknown",
    confidence: 0.2,
    title: "Choose a DPAL path",
    explanation:
      "I can help you choose a DPAL path. Do you want to scan a location, create a report, upload evidence, or open the map?",
    recommendedModule: recommended,
    routeTarget: recommended.routeTarget,
    nextBestAction: "Add a few more details (water, pollution, land, complaint, missing item) so DPAL can route correctly.",
    steps,
    safetyWarnings: STANDARD_SAFETY_WARNINGS,
    queryParams: buildQueryParams(ctx, "unknown"),
    alternateModules: [
      {
        id: "help-center",
        label: "Help Center",
        description: "Ask DPAL operators for help if no module fits.",
        routeTarget: ROUTES.helpCenter,
      },
    ],
  };
}

/* ----------------------------- public API --------------------------------- */

/** Run parser + classifier against a free-form input. */
export function interpretInput(rawInput: string): NavigatorInterpretation {
  const coordinates = parseCoordinates(rawInput);
  const scenario = detectScenario(rawInput);
  return {
    rawInput,
    coordinates,
    scenario,
    addressHint: extractAddressHint(rawInput),
  };
}

/** Map a scenario type → builder. */
function builderFor(type: ScenarioType): (ctx: BuildContext) => GuidedFlow {
  switch (type) {
    case "water_flood":
      return buildWaterFlowFlow;
    case "pollution_waste":
      return buildPollutionFlow;
    case "carbon_land":
      return buildCarbonLandFlow;
    case "public_report":
      return buildPublicReportFlow;
    case "locator":
      return buildLocatorFlow;
    case "transport_help":
      return buildTransportFlow;
    default:
      return buildUnknownFlow;
  }
}

/** Build a guided flow from an interpretation result. */
export function buildGuidedFlow(interpretation: NavigatorInterpretation): GuidedFlow {
  const ctx: BuildContext = {
    hasCoords: interpretation.coordinates.hasCoordinates,
    lat: interpretation.coordinates.lat,
    lng: interpretation.coordinates.lng,
    rawInput: interpretation.rawInput,
  };

  /**
   * Special-case: if the user typed *only* coordinates and no keywords,
   * water/flood is the highest civic-safety default route.
   */
  let scenarioType = interpretation.scenario.scenarioType;
  let confidence = interpretation.scenario.confidence;
  if (scenarioType === "unknown" && ctx.hasCoords) {
    scenarioType = "water_flood";
    confidence = 0.5;
  }

  const flow = builderFor(scenarioType)(ctx);
  /** Carry over the higher of (interpreter confidence, builder default). */
  return {
    ...flow,
    confidence: Math.max(flow.confidence, confidence),
  };
}

/** Convenience helper for components that don't need the intermediate object. */
export function planFlow(rawInput: string): {
  interpretation: NavigatorInterpretation;
  flow: GuidedFlow;
  flowId: string;
} {
  const interpretation = interpretInput(rawInput);
  const flow = buildGuidedFlow(interpretation);
  return { interpretation, flow, flowId: makeFlowId() };
}

/** Re-export the friendly label so consumers can `import { scenarioLabel }`. */
export { scenarioLabel };
