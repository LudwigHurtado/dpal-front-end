import { mockMissionAssignmentV2 } from '../data/mockMissionData';
import type { MissionAssignmentV2Model } from '../types';

export async function loadMissionAssignmentV2(): Promise<MissionAssignmentV2Model> {
  return Promise.resolve(mockMissionAssignmentV2);
}
