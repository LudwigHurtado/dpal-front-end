export type DpalProjectModuleType =
  | 'earth_observation'
  | 'aquascan'
  | 'carb_air'
  | 'carbon_viu'
  | 'hazardous_waste'
  | 'missions'
  | 'good_wheels'
  | 'generic_project';

export type DpalProjectGuideStep = {
  id: string;
  title: string;
  description: string;
  requiredState: string[];
};

export type DpalProjectGuideDefinition = {
  moduleType: DpalProjectModuleType;
  title: string;
  steps: DpalProjectGuideStep[];
};

export type DpalProjectClaimSafety = {
  canMakeClaim: boolean;
  safeClaimLanguage: string;
  unsafeClaimLanguage: string[];
};

export type DpalProjectGuideResponse = {
  ok: boolean;
  mode: 'AI' | 'RULE_BASED';
  currentStep: string;
  nextStep: string;
  plainEnglishExplanation: string;
  missingItems: string[];
  warnings: string[];
  recommendedActions: string[];
  claimSafety: DpalProjectClaimSafety;
};

export type DpalProjectGuideSnapshot = {
  currentStep?: string;
  nextStep?: string;
  plainEnglishExplanation?: string;
  missingItems?: string[];
  warnings?: string[];
  recommendedActions?: string[];
  claimSafety?: DpalProjectClaimSafety;
  lastUserQuestion?: string;
  lastGuideResponse?: string;
};

export type DpalProjectWorkflowState = {
  analysisType?: string;
  latitude?: number | null;
  longitude?: number | null;
  radiusKm?: number | null;
  aoiDraft?: boolean;
  aoiSaved?: boolean;
  scanRequested?: boolean;
  scanResult?: boolean;
  sourceMode?: string | null;
  signalStatus?: string | null;
  processingStage?: 'product_found' | 'imagery_loaded' | 'metric_computed' | 'field_verified' | string | null;
  beforeScene?: unknown;
  afterScene?: unknown;
  metricMethod?: string | null;
  riskLevel?: string | null;
  confidence?: number | null;
  metrics?: Record<string, number | string | null>;
  limitations?: string[];
  recommendedActions?: string[];
  evidencePacket?: boolean;
  missionCreated?: boolean;
  situationRoomSent?: boolean;
};

