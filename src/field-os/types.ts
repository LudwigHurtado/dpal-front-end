// src/field-os/types.ts

export interface DpalModule {
  name: string;
  description: string;
  execute(input: ModuleInput): Promise<ModuleOutput>;
}

export interface ModuleInput {
  [key: string]: any;
}

export interface ModuleOutput {
  success: boolean;
  data?: any;
  error?: string;
}

export interface Blueprint {
  name: string;
  description: string;
  steps: WorkflowStep[];
  executeWorkflow(inputs: WorkflowInputs): Promise<WorkflowResult>;
}

export interface WorkflowStep {
  id: string;
  name: string;
  description: string;
  requiredInputs: string[];
  module: string; // module name to execute
  outputKey: string; // key to store output in workflow state
}

export interface WorkflowInputs {
  [key: string]: any;
}

export interface WorkflowResult {
  steps: WorkflowStepResult[];
  requiredInputs: string[];
  outputArtifacts: Artifact[];
  confidenceStatus: ConfidenceLevel;
  nextRecommendedAction: string;
}

export interface WorkflowStepResult {
  stepId: string;
  success: boolean;
  output: any;
  timestamp: Date;
}

export interface Artifact {
  type: 'report' | 'evidence' | 'scan' | 'validation' | 'blockchain' | 'situation_room' | 'draft_hash_preview';
  id: string;
  data: any;
}

export type ConfidenceLevel = 'low' | 'medium' | 'high' | 'verified';

export interface Skill {
  name: string;
  description: string;
  execute(params: SkillParams): Promise<SkillResult>;
}

export interface SkillParams {
  [key: string]: any;
}

export interface SkillResult {
  success: boolean;
  data?: any;
  error?: string;
}

export interface SiteMemoryEntry {
  id: string;
  locationId?: string;
  reportId?: string;
  situationRoomId?: string;
  scanId?: string;
  blockchainHash?: string;
  type: 'report' | 'scan' | 'evidence' | 'validation' | 'situation_room';
  timestamp: Date;
  data: any;
}

export interface SiteMemoryQuery {
  locationId?: string;
  reportId?: string;
  situationRoomId?: string;
  scanId?: string;
  blockchainHash?: string;
  type?: string;
  startDate?: Date;
  endDate?: Date;
}

export interface EvidenceTimelineEvent {
  timestamp: Date;
  type: string;
  description: string;
  data: any;
  confidence: ConfidenceLevel;
}

export interface EvidenceReplay {
  caseId: string;
  timeline: EvidenceTimelineEvent[];
  summary: string;
}