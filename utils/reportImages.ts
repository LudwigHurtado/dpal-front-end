import { Category, type Report } from '../types';

const CATEGORY_REPORT_IMAGE_MAP: Partial<Record<Category, string>> = {
  [Category.AccidentsRoadHazards]: '/category-cards/accidents-and-road-hazards.png',
  [Category.Allergies]: '/category-cards/allergies.png',
  [Category.CivicDuty]: '/category-cards/civic-duty.png',
  [Category.Clergy]: '/category-cards/clergy.png',
  [Category.ConsumerScams]: '/category-cards/consumer-scams.png',
  [Category.DpalHelp]: '/category-cards/dpal-help.png',
  [Category.DpalLifts]: '/category-cards/dpal-lifts.png',
  [Category.DpalWorkNetwork]: '/main-screen/dpal-work-network.png',
  [Category.EarthObservation]: '/main-screen/satellite-water-analysis.png',
  [Category.EcologicalConservation]: '/main-screen/land-mineral-monitoring.png',
  [Category.Education]: '/category-cards/education.png',
  [Category.ElderlyCare]: '/category-cards/elder-abuse.png',
  [Category.Environment]: '/category-cards/environment.png',
  [Category.Events]: '/category-cards/event-transparency.png',
  [Category.FireEnvironmentalHazards]: '/category-cards/fire-environmental-hazards.png',
  [Category.GoodDeeds]: '/category-cards/good-deeds.png',
  [Category.HousingIssues]: '/category-cards/housing-issues.png',
  [Category.IndependentDiscoveries]: '/category-cards/Independent Discoveries.png',
  [Category.Infrastructure]: '/category-cards/infrastructure.png',
  [Category.InsuranceFraud]: '/category-cards/insurance fraud.png',
  [Category.MedicalNegligence]: '/category-cards/medical-negligence.png',
  [Category.NonProfit]: '/category-cards/Non-Profit.png',
  [Category.Other]: '/report-protect/main-panel-investigation-network-board.png',
  [Category.P2PEscrowVerification]: '/category-cards/marketplace-transactions-escrow.png',
  [Category.PoliceMisconduct]: '/category-cards/police-misconduct.png',
  [Category.ProofOfLifeBiometric]: '/category-cards/proof of life  biometric verification.png',
  [Category.ProfessionalServices]: '/category-cards/profesional-services.png',
  [Category.PublicSafetyAlerts]: '/category-cards/public-safety-alerts.png',
  [Category.PublicTransport]: '/category-cards/public transport.png',
  [Category.StolenPropertyRegistry]: '/category-cards/stolen-property-registry.png',
  [Category.Travel]: '/category-cards/travel.png',
  [Category.VeteransServices]: '/category-cards/veterans-services.png',
  [Category.WaterViolations]: '/category-cards/water-related.png',
  [Category.WorkplaceIssues]: '/category-cards/workplace-issues.png',
};

export const DEFAULT_REPORT_IMAGE = '/report-protect/main-panel-investigation-network-board.png';

export function getCategoryReportImage(category?: Category | null): string {
  return encodeURI(CATEGORY_REPORT_IMAGE_MAP[category ?? Category.Other] || DEFAULT_REPORT_IMAGE);
}

export function getReportImage(report?: Partial<Pick<Report, 'category' | 'imageUrls'>> | null): string {
  const rawImage = report?.imageUrls?.find((url) => typeof url === 'string' && url.trim().length > 0)?.trim();
  return encodeURI(rawImage || getCategoryReportImage(report?.category));
}
