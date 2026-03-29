import { Category } from './types';

/** Slug for default `/category-cards/<slug>.png` when no explicit path exists. */
export const categoryImageSlug = (value: string): string =>
  value
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

/** Same mapping as the File a Report category picker (`CategorySelectionView`). */
export const CATEGORY_IMAGE_BY_TYPE: Partial<Record<Category, string>> = {
  [Category.GoodDeeds]: '/category-cards/good-deeds.png',
  [Category.AccidentsRoadHazards]: '/category-cards/accidents-and-road-hazards.png',
  [Category.Allergies]: '/category-cards/allergies.png',
  [Category.CivicDuty]: '/category-cards/civic-duty.png',
  [Category.Clergy]: '/category-cards/clergy.png',
  [Category.ConsumerScams]: '/category-cards/consumer-scams.png',
  [Category.MedicalNegligence]: '/category-cards/medical-negligence.png',
  [Category.Education]: '/category-cards/education.png',
  [Category.ElderlyCare]: '/category-cards/elder-abuse.png',
  [Category.Events]: '/category-cards/event-transparency.png',
  [Category.FireEnvironmentalHazards]: '/category-cards/fire-environmental-hazards.png',
  [Category.PublicSafetyAlerts]: '/category-cards/public-safety-alerts.png',
  [Category.Environment]: '/category-cards/environment.png',
  [Category.WaterViolations]: '/category-cards/water-related.png',
  [Category.HousingIssues]: '/category-cards/housing-issues.png',
  [Category.Infrastructure]: '/category-cards/infrastructure.png',
  [Category.WorkplaceIssues]: '/category-cards/workplace-issues.png',
  [Category.InsuranceFraud]: '/category-cards/insurance fraud.png',
  [Category.ProfessionalServices]: '/category-cards/profesional-services.png',
  [Category.P2PEscrowVerification]: '/category-cards/marketplace-transactions-escrow.png',
  [Category.PoliceMisconduct]: '/category-cards/police-misconduct.png',
  [Category.StolenPropertyRegistry]: '/category-cards/stolen-property-registry.png',
  [Category.NonProfit]: '/category-cards/Non-Profit.png',
  [Category.ProofOfLifeBiometric]: '/category-cards/proof of life  biometric verification.png',
  [Category.PublicTransport]: '/category-cards/public transport.png',
  [Category.Travel]: '/category-cards/travel.png',
  [Category.VeteransServices]: '/category-cards/veterans-services.png',
  [Category.IndependentDiscoveries]: '/category-cards/Independent Discoveries.png',
  [Category.Other]: '/category-cards/Independent Discoveries.png',
  [Category.DpalHelp]: '/category-cards/dpal-help.png',
  [Category.DpalLifts]: '/category-cards/dpal-lifts.png',
  [Category.DpalWorkNetwork]: '/main-screen/dpal-work-network.png',
};

export type CategorySpritePos = { x: number; y: number };

/** Sprite sheet slice positions (same as category picker fallback). */
export const CATEGORY_SPRITE_POSITIONS: Partial<Record<Category, CategorySpritePos>> = {
  [Category.AccidentsRoadHazards]: { x: 0, y: 0 },
  [Category.Allergies]: { x: 1, y: 0 },
  [Category.CivicDuty]: { x: 2, y: 0 },
  [Category.Clergy]: { x: 0, y: 1 },
  [Category.ConsumerScams]: { x: 1, y: 1 },
  [Category.ElderlyCare]: { x: 2, y: 1 },
};

export const CATEGORY_SPRITE_SHEET_SRC = '/category-cards/category-collage.png';

/** Resolved image URL for a category card (matches category picker). */
export function getCategoryCardImageSrc(category: Category): string {
  const path =
    CATEGORY_IMAGE_BY_TYPE[category] ?? `/category-cards/${categoryImageSlug(category)}.png`;
  return encodeURI(path);
}
