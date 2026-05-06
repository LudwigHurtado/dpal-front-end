// src/field-os/blueprints/goodWheelsIncidentBlueprint.ts

import { Blueprint, WorkflowInputs, WorkflowResult, WorkflowStep, WorkflowStepResult, Artifact, ConfidenceLevel } from '../types';
import { ReportIntakeModule } from '../modules/ReportIntakeModule';
import { EvidenceVaultModule } from '../modules/EvidenceVaultModule';
import { SituationRoomModule } from '../modules/SituationRoomModule';
import { ValidatorReviewModule } from '../modules/ValidatorReviewModule';

export class GoodWheelsIncidentBlueprint implements Blueprint {
  name = 'GoodWheelsIncidentBlueprint';
  description = 'Blueprint for Good Wheels transportation incident investigation';

  steps: WorkflowStep[] = [
    {
      id: 'intake_incident',
      name: 'Incident Intake',
      description: 'Collect incident report details',
      requiredInputs: ['incidentType', 'location', 'participants'],
      module: 'ReportIntakeModule',
      outputKey: 'incident',
    },
    {
      id: 'gather_trip_evidence',
      name: 'Gather Trip Evidence',
      description: 'Collect trip logs and communications',
      requiredInputs: ['tripId'],
      module: 'EvidenceVaultModule',
      outputKey: 'evidence',
    },
    {
      id: 'create_incident_room',
      name: 'Create Incident Room',
      description: 'Set up incident investigation room',
      requiredInputs: ['incident', 'evidence'],
      module: 'SituationRoomModule',
      outputKey: 'situationRoom',
    },
    {
      id: 'initiate_validation',
      name: 'Initiate Validation',
      description: 'Request validation of incident findings',
      requiredInputs: ['evidence'],
      module: 'ValidatorReviewModule',
      outputKey: 'validation',
    },
  ];

  async executeWorkflow(inputs: WorkflowInputs): Promise<WorkflowResult> {
    const results: WorkflowStepResult[] = [];
    const artifacts: Artifact[] = [];
    let confidence: ConfidenceLevel = 'low';

    try {
      // Step 1: Incident Intake
      const reportModule = new ReportIntakeModule();
      const incidentResult = await reportModule.execute({
        category: 'transportation',
        description: `Good Wheels incident: ${inputs.incidentType}`,
        location: inputs.location,
      });
      results.push({
        stepId: 'intake_incident',
        success: incidentResult.success,
        output: incidentResult.data,
        timestamp: new Date(),
      });
      if (incidentResult.success) {
        artifacts.push({
          type: 'report',
          id: incidentResult.data.id,
          data: incidentResult.data,
        });
      }

      // Step 2: Gather Evidence
      const vaultModule = new EvidenceVaultModule();
      const evidenceResult = await vaultModule.execute({
        action: 'retrieve',
        evidenceId: inputs.tripId,
      });
      results.push({
        stepId: 'gather_trip_evidence',
        success: evidenceResult.success,
        output: evidenceResult.data,
        timestamp: new Date(),
      });
      if (evidenceResult.success) {
        artifacts.push({
          type: 'evidence',
          id: evidenceResult.data.id,
          data: evidenceResult.data,
        });
        confidence = 'medium';
      }

      // Step 3: Create Incident Room
      const roomModule = new SituationRoomModule();
      const roomResult = await roomModule.execute({
        action: 'create',
        data: { incident: incidentResult.data, evidence: evidenceResult.data },
      });
      results.push({
        stepId: 'create_incident_room',
        success: roomResult.success,
        output: roomResult.data,
        timestamp: new Date(),
      });
      if (roomResult.success) {
        artifacts.push({
          type: 'situation_room',
          id: roomResult.data.id,
          data: roomResult.data,
        });
      }

      // Step 4: Initiate Validation
      const validatorModule = new ValidatorReviewModule();
      const validationResult = await validatorModule.execute({
        action: 'request_review',
        evidenceId: evidenceResult.data.id,
        validatorId: inputs.validatorId,
      });
      results.push({
        stepId: 'initiate_validation',
        success: validationResult.success,
        output: validationResult.data,
        timestamp: new Date(),
      });
      if (validationResult.success) {
        artifacts.push({
          type: 'validation',
          id: `validation-${Date.now()}`,
          data: validationResult.data,
        });
        confidence = 'high';
      }

    } catch (error) {
      console.error('Error in Good Wheels incident workflow:', error);
    }

    return {
      steps: results,
      requiredInputs: ['incidentType', 'location', 'tripId'],
      outputArtifacts: artifacts,
      confidenceStatus: confidence,
      nextRecommendedAction: 'Coordinate with participants and complete incident resolution',
    };
  }
}