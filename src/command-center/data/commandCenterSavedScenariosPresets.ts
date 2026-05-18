import type { CommandCenterModuleKey, SavedScenarioPreset } from '../types';

/** Saved scenario presets — representative AOIs and module sets for repeat investigations (live runs use mission bar). */
export type CommandCenterSavedScenarioPresetRow = SavedScenarioPreset & {
  /** App view id for “Open primary workspace”. */
  primaryWorkspace: string;
};

export const COMMAND_CENTER_SAVED_SCENARIO_PRESETS: CommandCenterSavedScenarioPresetRow[] = [
  {
    id: 'santa_cruz_floodguard',
    title: 'Santa Cruz FloodGuard scenario',
    subtitle: 'Civic flood intelligence — decision-support; coordinate water + EO + Situation Room.',
    locationLabel: 'Santa Cruz County, California, USA',
    latitude: 36.9741,
    longitude: -122.0308,
    radiusKm: 35,
    defaultModules: ['water', 'earthObservation', 'situationRoom'],
    limitationNote:
      'FloodGuard and water intelligence are decision-support only. They do not replace government alerts. Review live readiness before batch runs.',
    primaryWorkspace: 'floodGuard',
  },
  {
    id: 'colorado_river_water',
    title: 'Colorado River water conservation scenario',
    subtitle: 'Multi-signal water context — AquaScan + Earth Observation + optional carbon context.',
    locationLabel: 'Lower Colorado River corridor, USA',
    latitude: 33.72,
    longitude: -114.62,
    radiusKm: 80,
    defaultModules: ['water', 'earthObservation', 'carbonViu', 'situationRoom'],
    limitationNote:
      'Conservation outcomes require agency data, field validation, and legal context — this preset only sets AOI and module selection.',
    primaryWorkspace: 'aquaScanWater',
  },
  {
    id: 'california_carb',
    title: 'California CARB emissions audit scenario',
    subtitle: 'Facility reconciliation — opens audit workspace; filings happen in the full module.',
    locationLabel: 'Los Angeles Basin, California, USA',
    latitude: 34.05,
    longitude: -118.25,
    radiusKm: 60,
    defaultModules: ['pollutionAudit', 'earthObservation', 'situationRoom'],
    limitationNote:
      'CARB and EPA feeds can disagree by year or facility id — analyst review is mandatory before any claim.',
    primaryWorkspace: 'carbEmissionsAudit',
  },
  {
    id: 'forest_afolu',
    title: 'Forest Integrity / AFOLU scenario',
    subtitle: 'Forest-risk evidence plus carbon pipeline cross-link.',
    locationLabel: 'Pacific Northwest reference AOI',
    latitude: 47.6,
    longitude: -122.33,
    radiusKm: 45,
    defaultModules: ['forestIntegrity', 'earthObservation', 'carbonViu', 'situationRoom'],
    limitationNote:
      'AFOLU and Forest Integrity UIs are separate entry points — this preset centers forest + DMRV context without inventing sequestration numbers.',
    primaryWorkspace: 'forestIntegrity',
  },
  {
    id: 'coastal_plastic_watch',
    title: 'Coastal Plastic Watch scenario',
    subtitle: 'Hyperspectral plastic-risk screening — evidence-support language only.',
    locationLabel: 'Southern California coast, USA',
    latitude: 33.86,
    longitude: -118.4,
    radiusKm: 40,
    defaultModules: ['plasticWatch', 'water', 'earthObservation', 'situationRoom'],
    limitationNote:
      'Satellite plastic-risk screening is not plastic detection — field and lab validation are required.',
    primaryWorkspace: 'hyperspectralPlasticWatch',
  },
];
