/**
 * Missions Hub — top-level sections (shell only; V2 remains the assignment engine).
 * URL: `/missions?section=<id>` (default: home)
 */
export type MissionsHubSection =
  | 'home'
  | 'marketplace'
  | 'emergency'
  | 'myMissions'
  | 'rewards'
  | 'local'
  | 'org'
  | 'validator'
  | 'analytics';

export const MISSIONS_HUB_SECTIONS: {
  id: MissionsHubSection;
  label: string;
  short: string;
  stub?: boolean;
}[] = [
  { id: 'home', label: 'Hub home', short: 'Home' },
  { id: 'marketplace', label: 'Mission Marketplace', short: 'Browse' },
  { id: 'emergency', label: 'Emergency board', short: 'Emergency', stub: true },
  { id: 'myMissions', label: 'My missions', short: 'Mine', stub: true },
  { id: 'rewards', label: 'Rewards center', short: 'Rewards', stub: true },
  { id: 'local', label: 'Local map & list', short: 'Local', stub: true },
  { id: 'org', label: 'Organization missions', short: 'Orgs', stub: true },
  { id: 'validator', label: 'Validator review', short: 'Review', stub: true },
  { id: 'analytics', label: 'Mission analytics', short: 'Stats', stub: true },
];

export const DEFAULT_MISSIONS_HUB_SECTION: MissionsHubSection = 'home';

export function parseMissionsHubSection(raw: string | null): MissionsHubSection {
  const allowed = new Set(MISSIONS_HUB_SECTIONS.map((s) => s.id));
  if (raw && allowed.has(raw as MissionsHubSection)) return raw as MissionsHubSection;
  return DEFAULT_MISSIONS_HUB_SECTION;
}
