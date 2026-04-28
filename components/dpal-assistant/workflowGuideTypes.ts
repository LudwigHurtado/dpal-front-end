export type DpalModuleType =
  | 'earth_observation'
  | 'aquascan'
  | 'carb_air'
  | 'carbon_viu'
  | 'hazardous_waste'
  | 'missions'
  | 'generic_project';

export type DpalWorkflowStep = {
  id: string;
  title: string;
  description: string;
  requiredState: string[];
};

export type DpalWorkflowGuideDefinition = {
  moduleType: DpalModuleType;
  title: string;
  steps: DpalWorkflowStep[];
};

export type DpalClaimSafety = {
  canMakeClaim: boolean;
  safeClaimLanguage: string;
  unsafeClaimLanguage: string[];
};

export type DpalGuideResponse = {
  ok: boolean;
  mode: 'AI' | 'RULE_BASED';
  currentStep: string;
  nextStep: string;
  plainEnglishExplanation: string;
  missingItems: string[];
  warnings: string[];
  recommendedActions: string[];
  claimSafety: DpalClaimSafety;
};

export type DpalAssistantWorkflowState = {
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
  riskLevel?: string | null;
  confidence?: number | null;
  metrics?: Record<string, number | string | null>;
  limitations?: string[];
  recommendedActions?: string[];
  evidencePacket?: boolean;
  missionCreated?: boolean;
};

