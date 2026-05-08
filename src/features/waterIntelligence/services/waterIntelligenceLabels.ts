import type { WaterDataSourceLabel } from './waterIntelligenceTypes';

const LABEL_DISPLAY: Record<WaterDataSourceLabel, string> = {
  live_api: 'Live API',
  imported: 'Imported',
  fallback: 'Fallback',
  user_submitted: 'User-submitted',
  satellite_derived: 'Satellite-derived',
  sensor_derived: 'Sensor-derived',
  ai_inferred: 'AI-inferred',
  human_verified: 'Human-verified',
  blockchain_anchored: 'Blockchain-anchored',
  mock_demo: 'Mock / Demo',
};

export function formatDataSourceLabel(label: WaterDataSourceLabel): string {
  return LABEL_DISPLAY[label];
}

export function formatTransactionCategory(cat: string): string {
  if (cat === 'resale') return 'Resale';
  if (cat === 'system_enhancement') return 'System enhancement';
  if (cat === 'sequestered_archived') return 'Sequestered / archived';
  return cat;
}

export function formatProjectStatus(s: string): string {
  return s.replace(/_/g, ' ');
}
