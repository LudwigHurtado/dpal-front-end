import type { WaterRightProfile } from './waterIntelligenceTypes';
import { COLORADO_MOCK_RIGHTS } from './coloradoRiverMockData';

export function listWaterRightProfiles(): WaterRightProfile[] {
  return COLORADO_MOCK_RIGHTS;
}

export function getRightsForProject(projectId: string): WaterRightProfile | undefined {
  return COLORADO_MOCK_RIGHTS.find((r) => r.projectId === projectId);
}
