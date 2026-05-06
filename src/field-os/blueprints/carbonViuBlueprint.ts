// src/field-os/blueprints/carbonViuBlueprint.ts

import { Blueprint, WorkflowInputs, WorkflowResult, WorkflowStep, WorkflowStepResult, Artifact, ConfidenceLevel } from '../types';
import { ReportIntakeModule } from '../modules/ReportIntakeModule';
import { SatelliteScanModule } from '../modules/SatelliteScanModule';
import { EvidenceVaultModule } from '../modules/EvidenceVaultModule';
import { BlockchainLogModule } from '../modules/BlockchainLogModule';

export class CarbonViuBlueprint implements Blueprint {
  name = 'CarbonViuBlueprint';
  description = 'Blueprint for carbon measurement, reporting, and verification';

  steps: WorkflowStep[] = [
    {
      id: 'intake_project',
      name: 'Project Intake',
      description: 'Collect carbon project details',
      requiredInputs: ['projectType', 'location', 'baseline'],
      module: 'ReportIntakeModule',
      outputKey: 'project',
    },
    {
      id: 'carbon_measurement',
      name: 'Carbon Measurement',
      description: 'Perform satellite carbon measurement',
      requiredInputs: ['location', 'parameters'],
      module: 'SatelliteScanModule',
      outputKey: 'measurement',
    },
    {
      id: 'store_carbon_evidence',
      name: 'Store Carbon Evidence',
      description: 'Store measurement data as evidence',
      requiredInputs: ['measurement'],
      module: 'EvidenceVaultModule',
      outputKey: 'evidence',
    },
    {
      id: 'blockchain_anchor',
      name: 'Prepare Blockchain Anchor Draft',
      description: 'Prepare a blockchain anchor preview draft (Dry Run — not submitted)',
      requiredInputs: ['evidence'],
      module: 'BlockchainLogModule',
      outputKey: 'blockchain',
    },
  ];

  async executeWorkflow(inputs: WorkflowInputs): Promise<WorkflowResult> {
    const results: WorkflowStepResult[] = [];
    const artifacts: Artifact[] = [];
    let confidence: ConfidenceLevel = 'low';

    try {
      // Step 1: Project Intake
      const reportModule = new ReportIntakeModule();
      const projectResult = await reportModule.execute({
        category: 'carbon',
        description: `Carbon project: ${inputs.projectType}`,
        location: inputs.location,
      });
      results.push({
        stepId: 'intake_project',
        success: projectResult.success,
        output: projectResult.data,
        timestamp: new Date(),
      });
      if (projectResult.success) {
        artifacts.push({
          type: 'report',
          id: projectResult.data.id,
          data: projectResult.data,
        });
      }

      // Step 2: Carbon Measurement
      const scanModule = new SatelliteScanModule();
      const measurementResult = await scanModule.execute({
        scanType: 'carbon',
        location: inputs.location,
        parameters: inputs.parameters,
      });
      results.push({
        stepId: 'carbon_measurement',
        success: measurementResult.success,
        output: measurementResult.data,
        timestamp: new Date(),
      });
      if (measurementResult.success) {
        artifacts.push({
          type: 'scan',
          id: `scan-${Date.now()}`,
          data: measurementResult.data,
        });
        confidence = 'medium';
      }

      // Step 3: Store Evidence
      const vaultModule = new EvidenceVaultModule();
      const vaultResult = await vaultModule.execute({
        action: 'store',
        evidenceId: `evidence-${Date.now()}`,
        data: measurementResult.data,
      });
      results.push({
        stepId: 'store_carbon_evidence',
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

      // Step 4: Blockchain Anchor Draft (Dry Run only)
      const blockchainModule = new BlockchainLogModule();
      const blockchainResult = await blockchainModule.execute({
        action: 'log',
        hash: `draftHashPreview-${Date.now()}`,
        data: vaultResult.data,
      });
      results.push({
        stepId: 'blockchain_anchor',
        success: blockchainResult.success,
        output: {
          ...blockchainResult.data,
          status: 'Blockchain anchor preview — not submitted',
          submissionState: 'dry-run-preview',
        },
        timestamp: new Date(),
      });
      if (blockchainResult.success) {
        artifacts.push({
          type: 'draft_hash_preview',
          id: `draft-hash-preview-${Date.now()}`,
          data: {
            draftHashPreview: blockchainResult.data.hash,
            status: 'Blockchain anchor preview — not submitted',
          },
        });
        confidence = 'medium';
      }

    } catch (error) {
      console.error('Error in Carbon VIU workflow:', error);
    }

    return {
      steps: results,
      requiredInputs: ['projectType', 'location', 'baseline'],
      outputArtifacts: artifacts,
      confidenceStatus: confidence,
      nextRecommendedAction:
        'Review Dry Run VIU outputs, collect human approvals, and prepare blockchain anchor draft for later submission.',
    };
  }
}