import type { CommandCenterModuleKey, GuidedInvestigationType } from '../types';

export type CommandCenterModuleRegistryEntry = {
  key: CommandCenterModuleKey;
  label: string;
  shortLabel: string;
  bestFor: string;
  defaultLimitations: string[];
  /** App `View` id for “open module”. */
  workspaceView: string;
  recommendedFor: GuidedInvestigationType[];
};

export const COMMAND_CENTER_MODULE_REGISTRY: CommandCenterModuleRegistryEntry[] = [
  {
    key: 'water',
    label: 'AquaScan · Water intelligence',
    shortLabel: 'AquaScan',
    bestFor: 'Water extent, Copernicus compare, intake / AOI context.',
    defaultLimitations: [
      'Indicative MRV context only — not a certified water credit or legal determination.',
      'Live adapters depend on configured API base and Copernicus credentials.',
    ],
    workspaceView: 'aquaScanWater',
    recommendedFor: ['water', 'full_environmental'],
  },
  {
    key: 'earthObservation',
    label: 'Earth Observation',
    shortLabel: 'Earth Observation',
    bestFor: 'LEO screening, before/after scene window, scene-level metrics.',
    defaultLimitations: [
      'Scene-level statistics are not zonal AOI averages unless a future zonal-stats step is added.',
      'Usable imagery depends on cloud cover, band availability, and date window.',
    ],
    workspaceView: 'earthObservation',
    recommendedFor: ['water', 'forest', 'plastic', 'full_environmental'],
  },
  {
    key: 'plasticWatch',
    label: 'Hyperspectral Plastic Watch',
    shortLabel: 'Plastic Watch',
    bestFor: 'PACE / EMIT lanes and spectral confounder context (evidence-support).',
    defaultLimitations: [
      'Evidence-support only — satellite anomalies are not proof of plastic without field validation.',
    ],
    workspaceView: 'hyperspectralPlasticWatch',
    recommendedFor: ['plastic', 'full_environmental'],
  },
  {
    key: 'forestIntegrity',
    label: 'Forest Integrity',
    shortLabel: 'Forest Integrity',
    bestFor: 'GFW / FIRMS / Landsat integrity lanes and forest-risk context.',
    defaultLimitations: [
      'Third-party forest feeds — not a sole legal finding or certified carbon claim.',
    ],
    workspaceView: 'forestIntegrity',
    recommendedFor: ['forest', 'full_environmental'],
  },
  {
    key: 'pollutionAudit',
    label: 'Pollution audit (CARB / EPA lanes)',
    shortLabel: 'Pollution audit',
    bestFor: 'Facility emissions records, cross-source reconciliation, audit draft.',
    defaultLimitations: [
      'Source reconciliation may flag mismatches; analyst review is required before claims.',
    ],
    workspaceView: 'carbEmissionsAudit',
    recommendedFor: ['pollution', 'full_environmental'],
  },
  {
    key: 'carbonViu',
    label: 'Carbon MRV / VIU context',
    shortLabel: 'Carbon / VIU',
    bestFor: 'Project MRV, air quality / mineral scan context where configured.',
    defaultLimitations: [
      'No automatic VIU issuance or carbon credit creation from Command Center previews.',
    ],
    workspaceView: 'carbonMRV',
    recommendedFor: ['carbon', 'full_environmental'],
  },
  {
    key: 'situationRoom',
    label: 'Situation Room',
    shortLabel: 'Situation Room',
    bestFor: 'Collaboration, media, and handoff after evidence is assembled.',
    defaultLimitations: [
      'Does not auto-publish reports or replace official emergency channels.',
    ],
    workspaceView: 'situationRoom',
    recommendedFor: ['water', 'pollution', 'forest', 'plastic', 'carbon', 'full_environmental'],
  },
];

export function getModuleRegistryEntry(key: CommandCenterModuleKey): CommandCenterModuleRegistryEntry | undefined {
  return COMMAND_CENTER_MODULE_REGISTRY.find((m) => m.key === key);
}

export function recommendModulesForInvestigation(type: GuidedInvestigationType): CommandCenterModuleKey[] {
  const set = new Set<CommandCenterModuleKey>();
  for (const row of COMMAND_CENTER_MODULE_REGISTRY) {
    if (row.recommendedFor.includes(type)) set.add(row.key);
  }
  return COMMAND_CENTER_MODULE_REGISTRY.map((r) => r.key).filter((k) => set.has(k));
}
