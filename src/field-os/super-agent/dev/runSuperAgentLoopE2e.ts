/**
 * Dev E2E checks for SuperAgentRuntime (Dry Run / Preview only).
 *
 * Run: npm run test:super-agent-loop
 *
 * TODO(backend): replace with CI Vitest + mocked adapters when Field OS has a test harness.
 */

import { SuperAgentRuntime } from '../runtime/superAgentRuntime';
import type { SuperAgentGoalInput } from '../superAgentTypes';

const SUPPORT = new Set(['EvidenceAgent', 'ReportAgent', 'ValidatorAgent']);

function fail(message: string): never {
  console.error(`FAIL: ${message}`);
  process.exit(1);
}

function ok(name: string) {
  console.log(`PASS: ${name}`);
}

function assert(cond: unknown, message: string): asserts cond {
  if (!cond) fail(message);
}

/** Goal-only input for missing-fields scenarios */
function goalOnly(goal: string): SuperAgentGoalInput {
  return { goal };
}

/** Full completion promise inputs */
function fullInput(partial: SuperAgentGoalInput): SuperAgentGoalInput {
  return {
    goal: partial.goal,
    location: partial.location ?? 'Test County, CA',
    dateRange: partial.dateRange ?? { startDate: '2026-03-01', endDate: '2026-04-30' },
    evidenceRefs: partial.evidenceRefs ?? ['mock-evidence-ref-1'],
  };
}

function assertExportComplete(rt: SuperAgentRuntime, label: string) {
  const exp = rt.export();
  assert(exp.currentPlan, `${label}: export.currentPlan`);
  assert(exp.currentCaseWorkspace, `${label}: export.currentCaseWorkspace`);
  assert(Array.isArray(exp.evidenceTimeline), `${label}: evidenceTimeline array`);
  assert(Array.isArray(exp.executionTraces), `${label}: executionTraces array`);
  assert(exp.completionStatus && typeof exp.completionStatus.caseId === 'string', `${label}: completionStatus`);
  assert(typeof exp.finalActionsBlocked === 'boolean', `${label}: finalActionsBlocked`);
  assert(typeof exp.humanApprovalRequired === 'boolean', `${label}: humanApprovalRequired`);
  assert(exp.planExportReason === undefined, `${label}: planExportReason should be absent when plan exists`);
}

function assertNoFalseVerificationClaims(rt: SuperAgentRuntime, label: string) {
  const exp = rt.export();
  const plan = exp.currentPlan;
  assert(plan, `${label}: plan for honesty check`);
  if (!plan.claimLabels.human_verified) {
    const blob = JSON.stringify(exp.evidenceTimeline) + JSON.stringify(exp.executionTraces);
    assert(!/\bis\s+human[\s-]?verified\b/i.test(blob), `${label}: wording must not falsely claim human verified`);
  }
  if (!plan.claimLabels.blockchain_anchored) {
    const blob = JSON.stringify(exp.evidenceTimeline) + JSON.stringify(exp.executionTraces);
    assert(!/\bis\s+blockchain[\s-]?anchored\b/i.test(blob), `${label}: wording must not falsely claim blockchain anchored`);
  }
}

async function case1WaterVegetation() {
  const rt = new SuperAgentRuntime({ dryRunMode: true });
  const input = fullInput({
    goal:
      'Investigate whether this property shows vegetation decline and water stress from March to April 2026.',
    dateRange: { startDate: '2026-03-01', endDate: '2026-04-30' },
  });

  const plan = await rt.createInvestigationPlan(input);
  assert(plan.subAgentsNeeded.includes('AquaScanAgent'), 'case1: AquaScanAgent');
  assert(plan.subAgentsNeeded.includes('EarthObservationAgent'), 'case1: EarthObservationAgent');
  assert(SUPPORT.has('EvidenceAgent') && plan.subAgentsNeeded.includes('EvidenceAgent'), 'case1: EvidenceAgent');
  assert(plan.subAgentsNeeded.includes('ReportAgent'), 'case1: ReportAgent');
  assert(plan.subAgentsNeeded.includes('ValidatorAgent'), 'case1: ValidatorAgent');

  const ws = rt.getCaseWorkspace();
  assert(ws, 'case1: workspace');
  assert(ws.mappedWorkflowIds.includes('aquascan-investigation'), 'case1: aquascan mapped');
  assert(ws.mappedWorkflowIds.includes('earth-observation-audit'), 'case1: earth-observation mapped');
  assert(ws.humanApprovalCheckpointIds.length > 0, 'case1: gates initialized');

  const preview = await rt.runPlannedWorkflowPreview();
  assert(preview.workflowResults.length >= 1, 'case1: preview ran');
  assert(preview.finalActionsBlocked === true, 'case1: final actions blocked before approvals');

  assertExportComplete(rt, 'case1');
  assertNoFalseVerificationClaims(rt, 'case1');
  ok('case1 water + vegetation');
}

async function case2ViuCarbon() {
  const rt = new SuperAgentRuntime({ dryRunMode: true });
  const input = fullInput({
    goal: 'Create a VIU workflow for a reforestation project with biomass improvement and CO2e impact.',
  });
  const plan = await rt.createInvestigationPlan(input);
  const ws = rt.getCaseWorkspace();
  assert(ws?.mappedWorkflowIds.includes('carbon-viu-project'), 'case2: carbon-viu-project mapped');
  assert(plan.subAgentsNeeded.includes('EarthObservationAgent'), 'case2: EarthObservationAgent');
  assert(plan.subAgentsNeeded.includes('ReportAgent'), 'case2: ReportAgent');
  assert(plan.subAgentsNeeded.includes('ValidatorAgent'), 'case2: ValidatorAgent');
  assert(plan.claimLabels.pending_verification === true, 'case2: pending_verification');
  assert(plan.claimLabels.ai_inferred === true, 'case2: ai_inferred');
  assert(plan.claimLabels.calculated === true, 'case2: calculated flag for modeled VIU/carbon goal');
  assert(plan.humanApprovalCheckpoints.includes('viu_draft_issuance'), 'case2: VIU draft issuance gated');

  await rt.runPlannedWorkflowPreview();
  assertExportComplete(rt, 'case2');
  assertNoFalseVerificationClaims(rt, 'case2');
  ok('case2 VIU / carbon');
}

async function case3GoodWheels() {
  const rt = new SuperAgentRuntime({ dryRunMode: true });
  const input = fullInput({
    goal: 'Review a Good Wheels ride incident involving a driver, passenger, and charity allocation.',
  });
  const plan = await rt.createInvestigationPlan(input);
  const ws = rt.getCaseWorkspace();
  assert(ws?.mappedWorkflowIds.includes('good-wheels-incident-review'), 'case3: good-wheels mapped');
  assert(
    plan.subAgentsNeeded.includes('EvidenceAgent') || plan.subAgentsNeeded.includes('MissionAgent'),
    'case3: EvidenceAgent or MissionAgent'
  );
  assert(plan.humanApprovalCheckpoints.includes('final_report_publication'), 'case3: final report gated');
  assert(plan.humanApprovalCheckpoints.includes('public_qr_publication'), 'case3: QR gated');
  assert(plan.humanApprovalCheckpoints.includes('legal_packet_export'), 'case3: legal packet gated');

  await rt.runPlannedWorkflowPreview();
  assertExportComplete(rt, 'case3');
  ok('case3 Good Wheels');
}

async function case4MissingInputs() {
  const rt = new SuperAgentRuntime({ dryRunMode: true });
  await rt.createInvestigationPlan(goalOnly('Audit water quality near the river mouth.'));
  const st = rt.checkCompletionStatus();
  assert(st.missingInputs.length > 0, 'case4: missingInputs non-empty');
  assert(st.planComplete === false, 'case4: planComplete false');
  assert(st.loopShouldContinue === true, 'case4: loopShouldContinue');
  assert(
    st.nextRecommendedAction.toLowerCase().includes('missing') ||
      st.missingInputs.some((m) => st.nextRecommendedAction.includes(m)),
    'case4: next action references missing fields'
  );
  ok('case4 missing inputs');
}

async function case5AllGatesApproved() {
  const rt = new SuperAgentRuntime({ dryRunMode: true });
  const plan = await rt.createInvestigationPlan(
    fullInput({ goal: 'Investigate vegetation and water stress on the northern parcel for March–April 2026.' })
  );

  const gateApprovals: Record<string, boolean> = {};
  for (const id of plan.humanApprovalCheckpoints) {
    gateApprovals[id] = true;
    rt.approveGate(id, 'e2e-reviewer', 'Dry Run checklist acknowledgment');
  }

  await rt.runPlannedWorkflowPreview({ gateApprovals });

  const st = rt.checkCompletionStatus();
  assert(st.approvalsCleared === true, 'case5: approvalsCleared');
  assert(st.finalActionsBlocked === false, 'case5: finalActionsBlocked false');
  assert(st.loopShouldContinue === false, 'case5: loopShouldContinue false');

  assert(plan.claimLabels.human_verified === false, 'case5: labels remain honest — not human_verified');
  assert(plan.claimLabels.blockchain_anchored === false, 'case5: labels remain honest — not blockchain_anchored');

  const loop = rt.continueLoop();
  assert(loop.loopShouldContinue === false, 'case5: continueLoop stable');

  const exp = rt.export();
  assert(exp.completionStatus.loopShouldContinue === false, 'case5: export completion');
  assertNoFalseVerificationClaims(rt, 'case5');
  ok('case5 approved gates');
}

async function main() {
  console.log('Super Agent Loop E2E (Dry Run)\n');
  await case1WaterVegetation();
  await case2ViuCarbon();
  await case3GoodWheels();
  await case4MissingInputs();
  await case5AllGatesApproved();
  console.log('\nAll Super Agent Loop E2E checks passed.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
