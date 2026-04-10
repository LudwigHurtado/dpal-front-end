import { mockMissionAssignmentV2 } from '../data/mockMissionData';
import type { MissionAssignmentV2Model } from '../types';
import type { Report } from '../../../types';
import { generateMissionDetailsFromReport } from '../../../services/geminiService';
import { loadMissionWorkspaceV2 } from './missionWorkspaceService';

function buildObjectivePhases(objective: string, rules: string[]): MissionAssignmentV2Model['details']['objectivePhases'] {
  const ruleItems = (rules || []).slice(0, 4).map((rule, idx) => ({
    id: `rule-${idx + 1}`,
    label: rule,
    done: false,
    images: [] as string[],
  }));
  return [
    {
      id: 'phase-beginning-objective',
      title: 'Beginning Objective',
      items: [
        { id: 'obj-1', label: objective || 'Define mission objective', done: false, images: [] },
        { id: 'obj-2', label: 'Add initial evidence photos', done: false, images: [] },
      ],
    },
    {
      id: 'phase-operational-checklist',
      title: 'Operational Checklist',
      items: ruleItems.length
        ? ruleItems
        : [{ id: 'rule-1', label: 'Capture required mission evidence', done: false, images: [] }],
    },
  ];
}

function inferMissionDetailsFromExistingData(report: Report): MissionAssignmentV2Model['details'] {
  const severity = String(report.severity || 'Standard');
  const level = severity === 'Critical' || severity === 'Catastrophic' ? 'high' : 'standard';
  const baseReward = level === 'high' ? '2,000 HC + Escrow Release' : '1,000 HC + Escrow Release';
  const deadline = level === 'high' ? 'Due in 24 hours' : 'Due in 72 hours';
  const fromStructuredRules = Array.isArray((report as any)?.structuredData?.rules)
    ? (report as any).structuredData.rules.slice(0, 5).map((r: unknown) => String(r))
    : null;

  return {
    missionType: 'Report Response Mission',
    objective: report.title ? `Resolve and verify: ${report.title}` : mockMissionAssignmentV2.details.objective,
    deadline,
    rewardLabel: baseReward,
    rewardType: 'HC',
    rewardAmount: level === 'high' ? 2000 : 1000,
    escrowLabel: 'Escrow pending validator lock',
    rules: fromStructuredRules && fromStructuredRules.length > 0
      ? fromStructuredRules
      : [
          'Lead approval required before closure.',
          'Verifier sign-off required before payout.',
          'Evidence required for each completed task.',
        ],
    objectivePhases: buildObjectivePhases(
      report.title ? `Resolve and verify: ${report.title}` : mockMissionAssignmentV2.details.objective,
      fromStructuredRules && fromStructuredRules.length > 0
        ? fromStructuredRules
        : [
            'Lead approval required before closure.',
            'Verifier sign-off required before payout.',
            'Evidence required for each completed task.',
          ],
    ),
  };
}

async function missionFromReport(report: Report): Promise<MissionAssignmentV2Model> {
  const firstImage =
    (Array.isArray(report.imageUrls) && report.imageUrls.length > 0 ? report.imageUrls[0] : null) ||
    (Array.isArray(report.filingImageHistory) && report.filingImageHistory.length > 0 ? report.filingImageHistory[0] : null);
  const shortId = report.id?.replace('rep-', '') || report.id || 'unknown';
  const fallbackDetails = inferMissionDetailsFromExistingData(report);

  let aiDetails:
    | {
        missionType: string;
        objective: string;
        deadline: string;
        rewardLabel: string;
        rewardType: 'Coins' | 'Tokens' | 'HC';
        rewardAmount: number;
        escrowLabel: string;
        rules: string[];
        objectivePhases: MissionAssignmentV2Model['details']['objectivePhases'];
      }
    | null = null;

  try {
    aiDetails = await generateMissionDetailsFromReport({
      title: String(report.title || ''),
      description: String(report.description || ''),
      category: String(report.category || ''),
      severity: String(report.severity || ''),
      location: String(report.location || ''),
    });
  } catch {
    aiDetails = null;
  }

  return {
    ...mockMissionAssignmentV2,
    identity: {
      ...mockMissionAssignmentV2.identity,
      id: `msn-${shortId}`,
      title: report.title || mockMissionAssignmentV2.identity.title,
      subtitle: `Mission derived from report ${report.id}`,
      missionType: aiDetails?.missionType || 'Report Response Mission',
      category: String(report.category || mockMissionAssignmentV2.identity.category),
      urgency: report.severity === 'Critical' || report.severity === 'Catastrophic' ? 'high' : 'medium',
    },
    report: {
      title: report.title || mockMissionAssignmentV2.report.title,
      reportId: report.id,
      issueType: report.severity || mockMissionAssignmentV2.report.issueType,
      location: report.location || mockMissionAssignmentV2.report.location,
      snapshot: report.description || mockMissionAssignmentV2.report.snapshot,
      imageUrl: firstImage || undefined,
    },
    details: {
      missionType: aiDetails?.missionType || fallbackDetails.missionType,
      objective: aiDetails?.objective || fallbackDetails.objective,
      deadline: aiDetails?.deadline || fallbackDetails.deadline,
      rewardLabel: aiDetails?.rewardLabel || fallbackDetails.rewardLabel,
      rewardType: aiDetails?.rewardType || fallbackDetails.rewardType,
      rewardAmount: aiDetails?.rewardAmount || fallbackDetails.rewardAmount,
      escrowLabel: aiDetails?.escrowLabel || fallbackDetails.escrowLabel,
      rules: aiDetails?.rules?.length ? aiDetails.rules : fallbackDetails.rules,
      objectivePhases: aiDetails?.objectivePhases?.length
        ? aiDetails.objectivePhases
        : buildObjectivePhases(
            aiDetails?.objective || fallbackDetails.objective,
            aiDetails?.rules?.length ? aiDetails.rules : fallbackDetails.rules,
          ),
    },
  };
}

export async function loadMissionAssignmentV2(sourceReport?: Report | null): Promise<MissionAssignmentV2Model> {
  if (sourceReport) {
    const generated = await missionFromReport(sourceReport);
    const persisted = await loadMissionWorkspaceV2(sourceReport.id);
    if (persisted.data) {
      const fallbackDetails = generated.details;
      const persistedDetails = persisted.data.details;
      return {
        ...persisted.data,
        // Keep report identity current if report was updated elsewhere.
        report: {
          ...persisted.data.report,
          reportId: sourceReport.id,
          title: sourceReport.title || persisted.data.report.title,
          location: sourceReport.location || persisted.data.report.location,
          snapshot: sourceReport.description || persisted.data.report.snapshot,
        },
        details: {
          ...persistedDetails,
          missionType: persistedDetails?.missionType || fallbackDetails.missionType,
          rewardType: persistedDetails?.rewardType || fallbackDetails.rewardType,
          rewardAmount: Number(persistedDetails?.rewardAmount || fallbackDetails.rewardAmount),
          objectivePhases:
            persistedDetails?.objectivePhases && persistedDetails.objectivePhases.length > 0
              ? persistedDetails.objectivePhases
              : fallbackDetails.objectivePhases,
        },
      };
    }
    return generated;
  }
  return Promise.resolve(mockMissionAssignmentV2);
}
