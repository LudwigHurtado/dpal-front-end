// src/field-os/blueprints/earthObservationBlueprint.ts

import { Blueprint, WorkflowInputs, WorkflowResult, WorkflowStep, WorkflowStepResult, Artifact, ConfidenceLevel } from '../types';
import { ReportIntakeModule } from '../modules/ReportIntakeModule';
import { SatelliteScanModule } from '../modules/SatelliteScanModule';
import { EvidenceVaultModule } from '../modules/EvidenceVaultModule';
import { SituationRoomModule } from '../modules/SituationRoomModule';

export class EarthObservationBlueprint implements Blueprint {
  name = 'EarthObservationBlueprint';
  description = 'Blueprint for earth observation and environmental monitoring';

  steps: WorkflowStep[] = [
    {
      id: 'intake_observation',
      name: 'Observation Intake',
      description: 'Collect area of interest and observation parameters',
      requiredInputs: ['location', 'analysisType'],
      module: 'ReportIntakeModule',
      outputKey: 'observation',
    },
    {
      id: 'perform_scan',
      name: 'Perform Earth Scan',
      description: 'Execute satellite earth observation scan',
      requiredInputs: ['location', 'parameters'],
      module: 'SatelliteScanModule',
      outputKey: 'scan',
    },
    {
      id: 'store_scan_evidence',
      name: 'Store Scan Evidence',
      description: 'Store observation results as evidence',
      requiredInputs: ['scan'],
      module: 'EvidenceVaultModule',
      outputKey: 'evidence',
    },
    {
      id: 'setup_observation_room',
      name: 'Setup Observation Room',
      description: 'Create collaborative observation analysis room',
      requiredInputs: ['observation', 'evidence'],
      module: 'SituationRoomModule',
      outputKey: 'situationRoom',
    },
  ];

  async executeWorkflow(inputs: WorkflowInputs): Promise<WorkflowResult> {
    const results: WorkflowStepResult[] = [];
    const artifacts: Artifact[] = [];
    let confidence: ConfidenceLevel = 'low';

    try {
      // Step 1: Observation Intake
      const reportModule = new ReportIntakeModule();
      const observationResult = await reportModule.execute({
        category: 'earth_observation',
        description: `Earth observation for ${inputs.analysisType}`,
        location: inputs.location,
      });
      results.push({
        stepId: 'intake_observation',
        success: observationResult.success,
        output: observationResult.data,
        timestamp: new Date(),
      });
      if (observationResult.success) {
        artifacts.push({
          type: 'report',
          id: observationResult.data.id,
          data: observationResult.data,
        });
      }

      // Step 2: Perform Scan
      const scanModule = new SatelliteScanModule();
      const scanResult = await scanModule.execute({
        scanType: 'earth_observation',
        location: inputs.location,
        parameters: inputs.parameters,
      });
      results.push({
        stepId: 'perform_scan',
        success: scanResult.success,
        output: scanResult.data,
        timestamp: new Date(),
      });
      if (scanResult.success) {
        artifacts.push({
          type: 'scan',
          id: `scan-${Date.now()}`,
          data: scanResult.data,
        });
        confidence = 'medium';
      }

      // Step 3: Store Evidence
      const vaultModule = new EvidenceVaultModule();
      const vaultResult = await vaultModule.execute({
        action: 'store',
        evidenceId: `evidence-${Date.now()}`,
        data: scanResult.data,
      });
      results.push({
        stepId: 'store_scan_evidence',
        success: vaultResult.success,
        output: vaultResult.data,
        timestamp: new Date(),
      });
      if (vaultResult.success) {
        artifacts.push({
          type: 'evidence',
          id: vaultResult.data.id,
          data: vaultResult.data,
        });
      }

      // Step 4: Setup Observation Room
      const roomModule = new SituationRoomModule();
      const roomResult = await roomModule.execute({
        action: 'create',
        data: { observation: observationResult.data, evidence: vaultResult.data },
      });
      results.push({
        stepId: 'setup_observation_room',
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
        confidence = 'high';
      }

    } catch (error) {
      console.error('Error in Earth Observation workflow:', error);
    }

    return {
      steps: results,
      requiredInputs: ['location', 'analysisType'],
      outputArtifacts: artifacts,
      confidenceStatus: confidence,
      nextRecommendedAction: 'Analyze observation data and coordinate with stakeholders',
    };
  }
}