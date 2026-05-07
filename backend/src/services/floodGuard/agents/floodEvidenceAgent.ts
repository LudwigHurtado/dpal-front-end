import type { FloodAgentFinding, FloodZoneAgentEvaluation } from '../floodGuardTypes';

/** Compact narrative for evidence hashing (Stage 12C). */
export function runEvidenceAgent(evaluation: FloodZoneAgentEvaluation): {
  headline: string;
  agentDigest: string[];
} {
  const agentDigest = evaluation.agentFindings.map(
    (f) => `[${f.agentId}] ${f.severity}: ${f.summary}`,
  );
  const headline = `Safety=${evaluation.missionSafetyClassification} · score=${evaluation.riskScore} · L${evaluation.alertLevel} · missionsRecommended=${evaluation.recommendedMissions.length}`;
  return { headline, agentDigest };
}
