// src/field-os/blueprints/carbAuditBlueprint.ts

import { Blueprint, WorkflowInputs, WorkflowResult, WorkflowStep, WorkflowStepResult, Artifact, ConfidenceLevel } from '../types';
import { ReportIntakeModule } from '../modules/ReportIntakeModule';
import { SatelliteScanModule } from '../modules/SatelliteScanModule';
import { EvidenceVaultModule } from '../modules/EvidenceVaultModule';
import { ValidatorReviewModule } from '../modules/ValidatorReviewModule';

export class CarbAuditBlueprint implements Blueprint {
  name = 'CarbAuditBlueprint';
  description = 'Blueprint for CARB emissions integrity audit';

  steps: WorkflowStep[] = [
    {
      id: 'intake_audit',
      name: 'Audit Intake',
      description: 'Collect facility and emissions data',
      requiredInputs: ['facilityId', 'reportingYear'],
      module: 'ReportIntakeModule',
      outputKey: 'audit',
    },
    {
      id: 'satellite_verification',
      name: 'Satellite Verification',
      description: 'Verify emissions with satellite data',
      requiredInputs: ['location', 'facilityId'],
      module: 'SatelliteScanModule',
      outputKey: 'verification',
    },
    {
      id: 'store_emissions_evidence',
      name: 'Store Emissions Evidence',
      description: 'Store audit and verification evidence',
      requiredInputs: ['audit', 'verification'],
      module: 'EvidenceVaultModule',
      outputKey: 'evidence',
    },
    {
      id: 'request_validator_review',
      name: 'Request Validator Review',
      description: 'Submit for validator review',
      requiredInputs: ['evidence'],
      module: 'ValidatorReviewModule',
      outputKey: 'review',
    },
  ];

  async executeWorkflow(inputs: WorkflowInputs): Promise<WorkflowResult> {
    const results: WorkflowStepResult[] = [];
    const artifacts: Artifact[] = [];
    let confidence: ConfidenceLevel = 'low';

    try {
      // Step 1: Audit Intake
      const reportModule = new ReportIntakeModule();
      const auditResult = await reportModule.execute({
        category: 'emissions',
        description: `CARB audit for facility ${inputs.facilityId}`,
        location: inputs.location,
      });
      results.push({
        stepId: 'intake_audit',
        success: auditResult.success,
        output: auditResult.data,
        timestamp: new Date(),
      });
      if (auditResult.success) {
        artifacts.push({
          type: 'report',
          id: auditResult.data.id,
          data: auditResult.data,
        });
      }

      // Step 2: Satellite Verification
      const scanModule = new SatelliteScanModule();
      const verificationResult = await scanModule.execute({
        scanType: 'carbon',
        location: inputs.location,
        parameters: { facilityId: inputs.facilityId },
      });
      results.push({
        stepId: 'satellite_verification',
        success: verificationResult.success,
        output: verificationResult.data,
        timestamp: new Date(),
      });
      if (verificationResult.success) {
        artifacts.push({
          type: 'scan',
          id: `scan-${Date.now()}`,
          data: verificationResult.data,
        });
        confidence = 'medium';
      }

      // Step 3: Store Evidence
      const vaultModule = new EvidenceVaultModule();
      const vaultResult = await vaultModule.execute({
        action: 'store',
        evidenceId: `evidence-${Date.now()}`,
        data: { audit: auditResult.data, verification: verificationResult.data },
      });
      results.push({
        stepId: 'store_emissions_evidence',
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

      // Step 4: Request Validator Review
      const validatorModule = new ValidatorReviewModule();
      const reviewResult = await validatorModule.execute({
        action: 'request_review',
        evidenceId: vaultResult.data.id,
        validatorId: inputs.validatorId,
      });
      results.push({
        stepId: 'request_validator_review',
        success: reviewResult.success,
        output: reviewResult.data,
        timestamp: new Date(),
      });
      if (reviewResult.success) {
        artifacts.push({
          type: 'validation',
          id: `validation-${Date.now()}`,
          data: reviewResult.data,
        });
        confidence = 'high';
      }

    } catch (error) {
      console.error('Error in CARB audit workflow:', error);
    }

    return {
      steps: results,
      requiredInputs: ['facilityId', 'reportingYear', 'location'],
      outputArtifacts: artifacts,
      confidenceStatus: confidence,
      nextRecommendedAction: 'Monitor validator review and prepare compliance report',
    };
  }
}