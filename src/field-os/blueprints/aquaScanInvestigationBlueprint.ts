// src/field-os/blueprints/aquaScanInvestigationBlueprint.ts

import { Blueprint, WorkflowInputs, WorkflowResult, WorkflowStep, WorkflowStepResult, Artifact, ConfidenceLevel } from '../types';
import { ReportIntakeModule } from '../modules/ReportIntakeModule';
import { SatelliteScanModule } from '../modules/SatelliteScanModule';
import { EvidenceVaultModule } from '../modules/EvidenceVaultModule';
import { SituationRoomModule } from '../modules/SituationRoomModule';

export class AquaScanInvestigationBlueprint implements Blueprint {
  name = 'AquaScanInvestigationBlueprint';
  description = 'Blueprint for water quality investigation using satellite scanning';

  steps: WorkflowStep[] = [
    {
      id: 'intake_report',
      name: 'Report Intake',
      description: 'Collect initial water concern report',
      requiredInputs: ['location', 'concern'],
      module: 'ReportIntakeModule',
      outputKey: 'report',
    },
    {
      id: 'satellite_scan',
      name: 'Satellite Scan',
      description: 'Perform satellite water quality scan',
      requiredInputs: ['location'],
      module: 'SatelliteScanModule',
      outputKey: 'scan',
    },
    {
      id: 'store_evidence',
      name: 'Store Evidence',
      description: 'Store scan results as evidence',
      requiredInputs: ['scan'],
      module: 'EvidenceVaultModule',
      outputKey: 'evidence',
    },
    {
      id: 'create_situation_room',
      name: 'Create Situation Room',
      description: 'Set up collaborative investigation room',
      requiredInputs: ['report', 'evidence'],
      module: 'SituationRoomModule',
      outputKey: 'situationRoom',
    },
  ];

  async executeWorkflow(inputs: WorkflowInputs): Promise<WorkflowResult> {
    const results: WorkflowStepResult[] = [];
    const artifacts: Artifact[] = [];
    let confidence: ConfidenceLevel = 'low';

    try {
      // Step 1: Report Intake
      const reportModule = new ReportIntakeModule();
      const reportResult = await reportModule.execute({
        category: 'water',
        description: inputs.concern,
        location: inputs.location,
      });
      results.push({
        stepId: 'intake_report',
        success: reportResult.success,
        output: reportResult.data,
        timestamp: new Date(),
      });
      if (reportResult.success) {
        artifacts.push({
          type: 'report',
          id: reportResult.data.id,
          data: reportResult.data,
        });
      }

      // Step 2: Satellite Scan
      const scanModule = new SatelliteScanModule();
      const scanResult = await scanModule.execute({
        scanType: 'water',
        location: inputs.location,
        parameters: inputs.parameters,
      });
      results.push({
        stepId: 'satellite_scan',
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
        stepId: 'store_evidence',
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

      // Step 4: Create Situation Room
      const roomModule = new SituationRoomModule();
      const roomResult = await roomModule.execute({
        action: 'create',
        data: { report: reportResult.data, evidence: vaultResult.data },
      });
      results.push({
        stepId: 'create_situation_room',
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
      console.error('Error in AquaScan workflow:', error);
    }

    return {
      steps: results,
      requiredInputs: ['location', 'concern'],
      outputArtifacts: artifacts,
      confidenceStatus: confidence,
      nextRecommendedAction: 'Review situation room and request validator input',
    };
  }
}