import type { VerificationStatus } from './verification';

export type ProjectType =
  | 'reforestation'
  | 'wetland_restoration'
  | 'plastic_cleanup'
  | 'clean_water'
  | 'soil_restoration'
  | 'biodiversity'
  | 'clean_energy'
  | 'other';

export type ProjectStatus = 'draft' | 'active' | 'monitoring' | 'verified' | 'completed' | 'archived';

export interface MapBoundary {
  lat: number;
  lng: number;
  radiusKm?: number;
  polygon?: Array<{ lat: number; lng: number }>;
}

export interface ImpactProject {
  id: string;
  title: string;
  type: ProjectType;
  status: ProjectStatus;
  ownerId: string;
  ownerOrg?: string;
  location: {
    address: string;
    country: string;
    boundary: MapBoundary;
  };
  baselineSummary: string;
  expectedOutcome: string;
  beneficiaryGroup: string;
  startDate: string;
  endDate?: string;
  areaHectares?: number;
  createdAt: string;
  updatedAt: string;
  evidenceCount: number;
  monitoringCheckCount: number;
  claimsCount: number;
  verificationStatus: VerificationStatus;
  tags: string[];
}

export const PROJECT_TYPE_LABELS: Record<ProjectType, string> = {
  reforestation: 'Reforestation',
  wetland_restoration: 'Wetland Restoration',
  plastic_cleanup: 'Plastic Cleanup',
  clean_water: 'Clean Water',
  soil_restoration: 'Soil Restoration',
  biodiversity: 'Biodiversity',
  clean_energy: 'Clean Energy',
  other: 'Other',
};

export const PROJECT_TYPE_ICONS: Record<ProjectType, string> = {
  reforestation: '🌳',
  wetland_restoration: '🌿',
  plastic_cleanup: '♻️',
  clean_water: '💧',
  soil_restoration: '🌱',
  biodiversity: '🦋',
  clean_energy: '☀️',
  other: '🌍',
};
