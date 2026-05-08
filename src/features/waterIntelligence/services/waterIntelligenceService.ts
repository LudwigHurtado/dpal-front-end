import type {
  PublicWaterVerificationRecord,
  VerifiedWaterConservationUnit,
  WaterConservationProject,
} from './waterIntelligenceTypes';
import {
  COLORADO_EXCHANGE_DASHBOARD,
  COLORADO_EXCHANGE_PILOT,
  COLORADO_MOCK_PROJECTS,
  COLORADO_MOCK_VWCUS,
  COLORADO_PUBLIC_VERIFICATION_RECORDS,
} from './coloradoRiverMockData';

export const waterIntelligenceService = {
  getPilotMeta: () => COLORADO_EXCHANGE_PILOT,
  getDashboard: () => COLORADO_EXCHANGE_DASHBOARD,
  listProjects: (): WaterConservationProject[] => COLORADO_MOCK_PROJECTS,
  listVwcus: (): VerifiedWaterConservationUnit[] => COLORADO_MOCK_VWCUS,
  listPublicRecords: (): PublicWaterVerificationRecord[] => COLORADO_PUBLIC_VERIFICATION_RECORDS,
  getPublicRecord(recordId: string): PublicWaterVerificationRecord | undefined {
    return COLORADO_PUBLIC_VERIFICATION_RECORDS.find((r) => r.recordId === recordId);
  },
};
