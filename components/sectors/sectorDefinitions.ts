import { Category } from '../../types';

export type ViewMode = 'classic' | 'next';
export type SectorKey = 'safety' | 'financial' | 'health' | 'government' | 'property' | 'digital' | 'community';

export interface SectorDefinition {
  key: SectorKey;
  label: string;
  subtitle: string;
  emoji: string;
  categories: Category[];
}

export interface CategoryMappingRow {
  classicCategory: Category;
  sector: SectorKey;
  nextCategory: string;
}

export const VIEW_MODE_STORAGE_KEY = 'dpal-view-mode';
export const VIEW_MODE_ONBOARDING_SEEN_KEY = 'dpal-view-mode-onboarding-seen';

export const SECTORS: SectorDefinition[] = [
  {
    key: 'safety',
    label: 'Safety',
    subtitle: 'Public protection, hazards, and emergency accountability',
    emoji: '🛡️',
    categories: [Category.PublicSafetyAlerts, Category.AccidentsRoadHazards, Category.PoliceMisconduct, Category.FireEnvironmentalHazards, Category.StolenPropertyRegistry],
  },
  {
    key: 'financial',
    label: 'Financial',
    subtitle: 'Scams, escrow, insurance, and marketplace trust',
    emoji: '💰',
    categories: [Category.ConsumerScams, Category.P2PEscrowVerification, Category.InsuranceFraud, Category.ProfessionalServices],
  },
  {
    key: 'health',
    label: 'Health',
    subtitle: 'Care quality, medical rights, and bio verification',
    emoji: '🏥',
    categories: [Category.MedicalNegligence, Category.Allergies, Category.ProofOfLifeBiometric],
  },
  {
    key: 'government',
    label: 'Government',
    subtitle: 'Civic systems, public institutions, and oversight',
    emoji: '🏛️',
    categories: [Category.CivicDuty, Category.VeteransServices, Category.PublicTransport, Category.Infrastructure, Category.Clergy],
  },
  {
    key: 'property',
    label: 'Property',
    subtitle: 'Housing, assets, and place-based concerns',
    emoji: '🏠',
    categories: [Category.HousingIssues, Category.WaterViolations, Category.Environment],
  },
  {
    key: 'digital',
    label: 'Digital',
    subtitle: 'Identity, online abuse, and technology evidence trails',
    emoji: '🌐',
    categories: [Category.Travel, Category.IndependentDiscoveries],
  },
  {
    key: 'community',
    label: 'Community',
    subtitle: 'Education, work life, and social accountability',
    emoji: '🐾',
    categories: [Category.GoodDeeds, Category.Education, Category.WorkplaceIssues, Category.ElderlyCare, Category.Events, Category.NonProfit, Category.Other],
  },
];

export const CATEGORY_MAPPINGS: CategoryMappingRow[] = [
  { classicCategory: Category.ConsumerScams, sector: 'financial', nextCategory: 'Marketplace Fraud' },
  { classicCategory: Category.P2PEscrowVerification, sector: 'financial', nextCategory: 'Escrow and Ownership Disputes' },
  { classicCategory: Category.PoliceMisconduct, sector: 'safety', nextCategory: 'Law Enforcement Abuse' },
  { classicCategory: Category.HousingIssues, sector: 'property', nextCategory: 'Unsafe Living Conditions' },
  { classicCategory: Category.MedicalNegligence, sector: 'health', nextCategory: 'Care Denial and Negligence' },
  { classicCategory: Category.CivicDuty, sector: 'government', nextCategory: 'Public Process Violations' },
  { classicCategory: Category.WorkplaceIssues, sector: 'community', nextCategory: 'Workplace Rights and Abuse' },
  { classicCategory: Category.GoodDeeds, sector: 'community', nextCategory: 'Kindness and Volunteer Missions' },
];

export const SECTOR_HERO_ASSET: Record<SectorKey, string> = {
  safety: '/next-view/sector-safety.png',
  financial: '/next-view/sector-financial.png',
  health: '/next-view/sector-health.png',
  government: '/main-screen/public-ledger.png',
  property: '/next-view/sector-property.png',
  digital: '/next-view/sector-digital.png',
  community: '/next-view/sector-community.png',
};
