import type { FloodAlertLevel } from '../floodGuardTypes';
import { FLOOD_AGENT_LEGAL } from './floodAgentConstants';

export function runSituationRoomAgent(args: {
  zoneId: string;
  alertLevel: FloodAlertLevel;
  riskScore: number;
}): { suggested: boolean; note?: string } {
  if (args.alertLevel >= 3 || args.riskScore >= 55) {
    return {
      suggested: true,
      note:
        `Situation Room Agent: open or maintain coordination for ${args.zoneId} — alert L${args.alertLevel}, score ${args.riskScore}. ` +
        `Escalate validators when safety class is remote_only or stricter. ${FLOOD_AGENT_LEGAL}`,
    };
  }
  if (args.alertLevel >= 2) {
    return {
      suggested: true,
      note:
        `Situation Room Agent: monitoring thread recommended for ${args.zoneId}. Keep updates remote-first. ${FLOOD_AGENT_LEGAL}`,
    };
  }
  return { suggested: false };
}
