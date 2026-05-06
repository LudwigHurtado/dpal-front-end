// src/field-os/workflowRegistry.ts

import { Blueprint, ConfidenceLevel } from './types';
import { AquaScanInvestigationBlueprint } from './blueprints/aquaScanInvestigationBlueprint';
import { EarthObservationBlueprint } from './blueprints/earthObservationBlueprint';
import { CarbAuditBlueprint } from './blueprints/carbAuditBlueprint';
import { CarbonViuBlueprint } from './blueprints/carbonViuBlueprint';
import { GoodWheelsIncidentBlueprint } from './blueprints/goodWheelsIncidentBlueprint';

export interface WorkflowDefinition {
  id: string;
  name: string;
  description: string;
  blueprint: Blueprint;
  toolsUsed: string[];
  expectedArtifacts: string[];
  defaultConfidence: ConfidenceLevel;
  dryRun: boolean;
  dryRunLabel?: string;
  exampleInputs: Record<string, any>;
}

const missionVerificationBlueprint: Blueprint = {
  name: 'MissionVerificationBlueprint',
  description: 'Blueprint for mission verification and proof review',
  steps: [
    {
      id: 'mission_intake',
      name: 'Mission Intake',
      description: 'Collect mission and proof metadata',
      requiredInputs: ['missionId'],
      module: 'ReportIntakeModule',
      outputKey: 'mission',
    },
    {
      id: 'collect_mission_evidence',
      name: 'Collect Mission Evidence',
      description: 'Gather mission submissions, proof, and validator notes',
      requiredInputs: ['missionId'],
      module: 'EvidenceVaultModule',
      outputKey: 'evidence',
    },
    {
      id: 'request_mission_validation',
      name: 'Request Mission Validation',
      description: 'Initiate mission verification review',
      requiredInputs: ['evidence'],
      module: 'ValidatorReviewModule',
      outputKey: 'validation',
    },
  ],
  async executeWorkflow(inputs) {
    const stepResults = [
      {
        stepId: 'mission_intake',
        success: true,
        output: { missionId: inputs.missionId, status: 'intake prepared' },
        timestamp: new Date(),
      },
      {
        stepId: 'collect_mission_evidence',
        success: true,
        output: { missionId: inputs.missionId, evidence: 'Pending live service adapter.' },
        timestamp: new Date(),
      },
      {
        stepId: 'request_mission_validation',
        success: true,
        output: { evidenceId: `evidence-${inputs.missionId}`, validatorRequested: true },
        timestamp: new Date(),
      },
    ];

    return {
      steps: stepResults,
      requiredInputs: ['missionId'],
      outputArtifacts: [
        { type: 'report', id: `mission-${inputs.missionId}`, data: { missionId: inputs.missionId } },
        { type: 'evidence', id: `evidence-${inputs.missionId}`, data: { missionId: inputs.missionId } },
        { type: 'validation', id: `validation-${inputs.missionId}`, data: { evidenceId: `evidence-${inputs.missionId}` } },
      ],
      confidenceStatus: 'low',
      nextRecommendedAction: 'Return to the mission workspace when the live mission adapter is connected.',
    };
  },
};

const WORKFLOWS: WorkflowDefinition[] = [
  {
    id: 'aquascan-investigation',
    name: 'AquaScan Water Investigation',
    description: 'Turn a water concern into a structured investigation workflow with satellite evidence and collaboration.',
    blueprint: new AquaScanInvestigationBlueprint(),
    toolsUsed: ['AquaScan', 'Evidence Vault', 'Situation Room'],
    expectedArtifacts: ['report', 'scan', 'evidence', 'situation_room'],
    defaultConfidence: 'medium',
    dryRun: true,
    dryRunLabel: 'Dry Run — real service connection pending.',
    exampleInputs: {
      location: { lat: 37.25, lng: -119.8 },
      concern: 'Observed poor water color and suspicious discharge near the river.',
      parameters: { analysisType: 'water_quality' },
    },
  },
  {
    id: 'earth-observation-audit',
    name: 'Earth Observation Audit',
    description: 'Orchestrate earth observation scans and evidence storage for environmental audit workflows.',
    blueprint: new EarthObservationBlueprint(),
    toolsUsed: ['Earth Observation', 'Evidence Vault', 'Situation Room'],
    expectedArtifacts: ['report', 'scan', 'evidence', 'situation_room'],
    defaultConfidence: 'medium',
    dryRun: true,
    dryRunLabel: 'Dry Run — real service connection pending.',
    exampleInputs: {
      location: { lat: 34.05, lng: -118.25 },
      analysisType: 'land_change',
      parameters: { dateRange: '30d' },
    },
  },
  {
    id: 'carb-emissions-audit',
    name: 'CARB Emissions Audit',
    description: 'Coordinate CARB audit intake, satellite verification, and validator review.',
    blueprint: new CarbAuditBlueprint(),
    toolsUsed: ['CARB Audit', 'Satellite Scan', 'Evidence Vault', 'Validator Review'],
    expectedArtifacts: ['report', 'scan', 'evidence', 'validation'],
    defaultConfidence: 'medium',
    dryRun: true,
    dryRunLabel: 'Dry Run — real service connection pending.',
    exampleInputs: {
      facilityId: 'CARB-1234',
      reportingYear: 2025,
      location: { lat: 38.58, lng: -121.49 },
      validatorId: 'validator-01',
    },
  },
  {
    id: 'carbon-viu-project',
    name: 'Carbon VIU Project',
    description: 'Orchestrate carbon measurement, evidence anchoring, and blockchain logging.',
    blueprint: new CarbonViuBlueprint(),
    toolsUsed: ['Carbon VIU', 'Satellite Scan', 'Evidence Vault', 'Blockchain Log'],
    expectedArtifacts: ['report', 'scan', 'evidence', 'blockchain'],
    defaultConfidence: 'medium',
    dryRun: true,
    dryRunLabel: 'Dry Run — real service connection pending.',
    exampleInputs: {
      projectType: 'reforestation',
      baseline: '2024 baseline carbon inventory',
      location: { lat: -3.12, lng: -60.02 },
      parameters: { vegetationIndex: 'NDVI' },
    },
  },
  {
    id: 'good-wheels-incident-review',
    name: 'Good Wheels Incident Review',
    description: 'Turn a transportation incident into a verified investigation with trip evidence and review.',
    blueprint: new GoodWheelsIncidentBlueprint(),
    toolsUsed: ['Good Wheels', 'Evidence Vault', 'Situation Room', 'Validator Review'],
    expectedArtifacts: ['report', 'evidence', 'situation_room', 'validation'],
    defaultConfidence: 'medium',
    dryRun: true,
    dryRunLabel: 'Dry Run — real service connection pending.',
    exampleInputs: {
      incidentType: 'Passenger safety concern',
      location: { lat: 40.71, lng: -74.01 },
      participants: ['driver', 'passenger'],
      tripId: 'trip-5678',
      validatorId: 'validator-02',
    },
  },
  {
    id: 'mission-verification',
    name: 'Mission Verification',
    description: 'Verify mission completion with evidence collection and validator review.',
    blueprint: missionVerificationBlueprint,
    toolsUsed: ['Mission Framework', 'Evidence Vault', 'Validator Review'],
    expectedArtifacts: ['report', 'evidence', 'validation'],
    defaultConfidence: 'low',
    dryRun: true,
    dryRunLabel: 'Dry Run — real service connection pending.',
    exampleInputs: {
      missionId: 'mission-9012',
    },
  },
];

export function getWorkflowDefinitions(): WorkflowDefinition[] {
  return WORKFLOWS;
}

export function getWorkflowDefinition(id: string): WorkflowDefinition | null {
  return WORKFLOWS.find((workflow) => workflow.id === id) ?? null;
}
