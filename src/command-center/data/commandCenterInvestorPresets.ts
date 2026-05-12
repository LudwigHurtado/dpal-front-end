import type { CommandCenterModuleKey, InvestorDemoPreset } from '../types';

/** Curated investor-safe presets — coordinates are representative; no live API calls from this list. */
export type CommandCenterInvestorPresetRow = InvestorDemoPreset & {
  /** App view id for “Open demo workspace”. */
  primaryWorkspace: string;
};

export const COMMAND_CENTER_INVESTOR_PRESETS: CommandCenterInvestorPresetRow[] = [
  {
    id: 'santa_cruz_floodguard',
    title: 'Santa Cruz FloodGuard Demo',
    subtitle: 'Civic flood intelligence walkthrough — preview-oriented, no auto-routing.',
    locationLabel: 'Santa Cruz County, California, USA',
    latitude: 36.9741,
    longitude: -122.0308,
    radiusKm: 35,
    defaultModules: ['water', 'earthObservation', 'situationRoom'],
    limitationNote:
      'FloodGuard and water intelligence are decision-support only. They do not replace government alerts. Demo framing avoids risky live batch calls.',
    primaryWorkspace: 'floodGuard',
  },
  {
    id: 'colorado_river_water',
    title: 'Colorado River Water Conservation Demo',
    subtitle: 'Multi-signal water context — AquaScan + Earth Observation framing.',
    locationLabel: 'Lower Colorado River corridor, USA',
    latitude: 33.72,
    longitude: -114.62,
    radiusKm: 80,
    defaultModules: ['water', 'earthObservation', 'carbonViu', 'situationRoom'],
    limitationNote:
      'Conservation outcomes require agency data, field validation, and legal context — this preset only loads safe preview copy.',
    primaryWorkspace: 'aquaScanWater',
  },
  {
    id: 'california_carb',
    title: 'California CARB Emissions Audit Demo',
    subtitle: 'Facility reconciliation narrative — opens audit workspace, not a live filing.',
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
    title: 'Forest Integrity / AFOLU Demo',
    subtitle: 'Forest-risk evidence plus carbon pipeline cross-link.',
    locationLabel: 'Pacific Northwest reference AOI',
    latitude: 47.6,
    longitude: -122.33,
    radiusKm: 45,
    defaultModules: ['forestIntegrity', 'earthObservation', 'carbonViu', 'situationRoom'],
    limitationNote:
      'AFOLU and Forest Integrity UIs are separate entry points — this preset centers forest + MRV context without inventing sequestration numbers.',
    primaryWorkspace: 'forestIntegrity',
  },
  {
    id: 'coastal_plastic_watch',
    title: 'Coastal Plastic Watch Demo',
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
